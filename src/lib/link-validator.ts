import { LinkStatus } from '@/types';

export interface LinkValidationResult {
  status: LinkStatus;
  httpStatus?: number | null;
  finalUrl?: string | null;
  message: string;
  checkedAt: string;
}

// IP / Hostname Blacklists for SSRF Prevention
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]',
  '::1',
  'metadata.google.internal',
  'instance-data',
]);

/**
 * Validate URL string format and prevent SSRF to private/internal network addresses
 */
export function validateUrlSafety(urlString: string): {
  isSafe: boolean;
  reason?: string;
  parsedUrl?: URL;
} {
  if (!urlString || typeof urlString !== 'string') {
    return { isSafe: false, reason: 'URL must be a non-empty string' };
  }

  const trimmed = urlString.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { isSafe: false, reason: 'Malformed URL syntax' };
  }

  // 1. Protocol check: Allow ONLY http: and https:
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      isSafe: false,
      reason: `Unsupported protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.`,
    };
  }

  // 2. Hostname check
  const host = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(host)) {
    return { isSafe: false, reason: `Access to "${host}" is restricted for security.` };
  }

  // Check for private IPv4 patterns (RFC 1918, RFC 3927, Loopback)
  // 10.x.x.x
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
    return { isSafe: false, reason: 'Private network address (10.0.0.0/8) is restricted.' };
  }

  // 172.16.x.x - 172.31.x.x
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) {
    return { isSafe: false, reason: 'Private network address (172.16.0.0/12) is restricted.' };
  }

  // 192.168.x.x
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) {
    return { isSafe: false, reason: 'Private network address (192.168.0.0/16) is restricted.' };
  }

  // 169.254.x.x (Link-Local & Cloud Metadata e.g. AWS/GCP 169.254.169.254)
  if (/^169\.254\.\d{1,3}\.\d{1,3}$/.test(host)) {
    return { isSafe: false, reason: 'Link-local and metadata address is restricted.' };
  }

  // 127.x.x.x (Loopback)
  if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
    return { isSafe: false, reason: 'Loopback address is restricted.' };
  }

  // 100.64.x.x - 100.127.x.x (CGNAT)
  if (/^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\.\d{1,3}\.\d{1,3}$/.test(host)) {
    return { isSafe: false, reason: 'Shared carrier-grade NAT address is restricted.' };
  }

  // Non-public TLDs
  if (host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.arpa')) {
    return { isSafe: false, reason: 'Internal domain suffix is restricted.' };
  }

  return { isSafe: true, parsedUrl: parsed };
}

export interface LinkCheckOptions {
  timeoutMs?: number;
  maxRedirects?: number;
  fetcher?: typeof fetch;
}

/**
 * Reusable, SSRF-safe link validation service.
 * Handles timeouts, redirects, HTTP statuses, and anti-bot/TLS edge cases.
 */
export async function checkLink(
  urlString: string,
  options: LinkCheckOptions = {}
): Promise<LinkValidationResult> {
  const checkedAt = new Date().toISOString();
  const { timeoutMs = 5000, maxRedirects = 3, fetcher = fetch } = options;

  // 1. SSRF and Syntax Validation
  const safety = validateUrlSafety(urlString);
  if (!safety.isSafe || !safety.parsedUrl) {
    return {
      status: 'invalid_url',
      httpStatus: null,
      finalUrl: null,
      message: safety.reason || 'Invalid or prohibited URL',
      checkedAt,
    };
  }

  let currentUrl = safety.parsedUrl.toString();
  let redirectsFollowed = 0;

  try {
    while (redirectsFollowed <= maxRedirects) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      let response: Response;
      try {
        response = await fetcher(currentUrl, {
          method: 'GET',
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 InternPath/1.0',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });
      } finally {
        clearTimeout(timer);
      }

      const status = response.status;

      // Handle Redirects (301, 302, 307, 308)
      if (status === 301 || status === 302 || status === 303 || status === 307 || status === 308) {
        const locationHeader = response.headers.get('location');
        if (!locationHeader) {
          return {
            status: 'redirected',
            httpStatus: status,
            finalUrl: currentUrl,
            message: `Server returned HTTP ${status} redirect without a destination header.`,
            checkedAt,
          };
        }

        // Resolve relative redirects safely
        let nextUrl: URL;
        try {
          nextUrl = new URL(locationHeader, currentUrl);
        } catch {
          return {
            status: 'needs_manual_verification',
            httpStatus: status,
            finalUrl: locationHeader,
            message: `Server redirected to an unparseable location: ${locationHeader}`,
            checkedAt,
          };
        }

        // Check redirect target safety
        const targetSafety = validateUrlSafety(nextUrl.toString());
        if (!targetSafety.isSafe) {
          return {
            status: 'needs_manual_verification',
            httpStatus: status,
            finalUrl: nextUrl.toString(),
            message: `Redirect destination blocked: ${targetSafety.reason}`,
            checkedAt,
          };
        }

        redirectsFollowed++;
        currentUrl = nextUrl.toString();

        if (redirectsFollowed > maxRedirects) {
          return {
            status: 'redirected',
            httpStatus: status,
            finalUrl: currentUrl,
            message: `Redirect chain exceeded ${maxRedirects} hops. Final target: ${currentUrl}`,
            checkedAt,
          };
        }

        continue;
      }

      // HTTP Success (200 - 299)
      if (status >= 200 && status < 300) {
        return {
          status: redirectsFollowed > 0 ? 'redirected' : 'working',
          httpStatus: status,
          finalUrl: redirectsFollowed > 0 ? currentUrl : null,
          message:
            redirectsFollowed > 0
              ? `Reachable after redirect to ${currentUrl} (HTTP ${status})`
              : `Link verified working (HTTP ${status})`,
          checkedAt,
        };
      }

      // Access Restricted / Anti-Bot (401, 403)
      // Note: Never claim website is broken when automated probes are blocked by institutional WAFs!
      if (status === 401 || status === 403) {
        return {
          status: 'access_restricted',
          httpStatus: status,
          finalUrl: currentUrl,
          message: `Access restricted (HTTP ${status}). Server uses anti-bot or campus firewall. Direct student browser access remains functional.`,
          checkedAt,
        };
      }

      // Not Found (404, 410)
      if (status === 404 || status === 410) {
        return {
          status: 'needs_manual_verification',
          httpStatus: status,
          finalUrl: currentUrl,
          message: `Page returned HTTP ${status} (Not Found). Application window may be archived or URL path updated.`,
          checkedAt,
        };
      }

      // Server Errors (500 - 599)
      if (status >= 500) {
        return {
          status: 'temporarily_unavailable',
          httpStatus: status,
          finalUrl: currentUrl,
          message: `Institutional server returned temporary HTTP ${status} error. Retry later.`,
          checkedAt,
        };
      }

      return {
        status: 'needs_manual_verification',
        httpStatus: status,
        finalUrl: currentUrl,
        message: `Unexpected HTTP ${status} response code.`,
        checkedAt,
      };
    }

    return {
      status: 'redirected',
      httpStatus: 300,
      finalUrl: currentUrl,
      message: 'Too many redirects.',
      checkedAt,
    };
  } catch (err: unknown) {
    const errorStr = err instanceof Error ? err.message : String(err);

    // Timeout Error
    if (errorStr.toLowerCase().includes('aborted') || errorStr.toLowerCase().includes('timeout')) {
      return {
        status: 'temporarily_unavailable',
        httpStatus: null,
        finalUrl: null,
        message: `Connection timed out after ${timeoutMs / 1000}s. Server may be slow or firewall-restricted.`,
        checkedAt,
      };
    }

    // TLS / Certificate Errors
    if (
      errorStr.toLowerCase().includes('cert') ||
      errorStr.toLowerCase().includes('tls') ||
      errorStr.toLowerCase().includes('ssl') ||
      errorStr.toLowerCase().includes('revoked')
    ) {
      return {
        status: 'needs_manual_verification',
        httpStatus: null,
        finalUrl: null,
        message:
          'Institutional SSL/TLS certificate issue detected (e.g. NIC government certificate chain). Student browser access functional.',
        checkedAt,
      };
    }

    // DNS or Network Failures (ENOTFOUND, ECONNREFUSED, etc.)
    return {
      status: 'unreachable',
      httpStatus: null,
      finalUrl: null,
      message: `Server unreachable: ${errorStr}`,
      checkedAt,
    };
  }
}

/**
 * Convenience helper returning snake_case attributes matching Internship model
 */
export async function validateApplicationUrl(
  urlString: string,
  options?: LinkCheckOptions
): Promise<{
  status: LinkStatus;
  http_status: number | null;
  final_url: string | null;
  error_message: string | null;
  checked_at: string;
}> {
  const res = await checkLink(urlString, options);
  return {
    status: res.status,
    http_status: res.httpStatus ?? null,
    final_url: res.finalUrl ?? null,
    error_message: res.status === 'working' ? null : res.message,
    checked_at: res.checkedAt,
  };
}
