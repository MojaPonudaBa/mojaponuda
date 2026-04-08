import "server-only";

export interface SourceValidationResult {
  valid: boolean;
  status_code?: number;
  error?: string;
  domain_match: boolean;
  redirect_chain?: string[];
  validated_at: string;
}

export interface ValidationItem {
  url: string;
  expectedDomain: string;
  opportunityId: string;
}

/**
 * SourceValidator validates that source URLs are accessible and match expected domains
 * Implements rate limiting and redirect following for robust validation
 */
export class SourceValidator {
  private readonly timeout: number = 5000; // 5 seconds
  private readonly maxRedirects: number = 3;
  private readonly rateLimit: number = 5; // requests per second

  /**
   * Validates that source_url is accessible and matches expected domain
   * @param url - Source URL to validate
   * @param expectedDomain - Expected domain pattern (e.g., "fmrpo.gov.ba")
   * @returns Validation result with status and error details
   */
  async validateSourceUrl(
    url: string,
    expectedDomain: string
  ): Promise<SourceValidationResult> {
    const validated_at = new Date().toISOString();
    const redirect_chain: string[] = [];

    try {
      // Parse URL to extract domain
      const urlObj = new URL(url);
      const actualDomain = urlObj.hostname;

      // Check domain match
      const domain_match = this.checkDomainMatch(actualDomain, expectedDomain);

      // Fetch URL with timeout and redirect following
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        let currentUrl = url;
        let redirectCount = 0;
        let finalResponse: Response | null = null;

        // Manual redirect following to track chain
        while (redirectCount <= this.maxRedirects) {
          const response = await fetch(currentUrl, {
            method: "HEAD", // Use HEAD to avoid downloading content
            signal: controller.signal,
            redirect: "manual", // Handle redirects manually
            headers: {
              "User-Agent": "MojaPonuda.ba/1.0 (Source Validator)",
            },
          });

          // Track redirect chain
          if (redirect_chain.length === 0 || redirect_chain[redirect_chain.length - 1] !== currentUrl) {
            redirect_chain.push(currentUrl);
          }

          // Check if redirect
          if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get("location");
            if (!location) {
              clearTimeout(timeoutId);
              return {
                valid: false,
                status_code: response.status,
                error: "Redirect without location header",
                domain_match,
                redirect_chain,
                validated_at,
              };
            }

            // Resolve relative URLs
            currentUrl = new URL(location, currentUrl).toString();
            redirectCount++;

            if (redirectCount > this.maxRedirects) {
              clearTimeout(timeoutId);
              return {
                valid: false,
                status_code: response.status,
                error: `Too many redirects (>${this.maxRedirects})`,
                domain_match,
                redirect_chain,
                validated_at,
              };
            }
          } else {
            finalResponse = response;
            break;
          }
        }

        clearTimeout(timeoutId);

        if (!finalResponse) {
          return {
            valid: false,
            error: "No final response after redirects",
            domain_match,
            redirect_chain,
            validated_at,
          };
        }

        // Check status code (200-299 is success)
        const valid = finalResponse.status >= 200 && finalResponse.status < 300;

        return {
          valid: valid && domain_match,
          status_code: finalResponse.status,
          error: valid ? undefined : `HTTP ${finalResponse.status}`,
          domain_match,
          redirect_chain: redirect_chain.length > 1 ? redirect_chain : undefined,
          validated_at,
        };
      } catch (fetchError) {
        clearTimeout(timeoutId);

        if (fetchError instanceof Error) {
          if (fetchError.name === "AbortError") {
            return {
              valid: false,
              error: `Timeout after ${this.timeout}ms`,
              domain_match,
              redirect_chain: redirect_chain.length > 0 ? redirect_chain : undefined,
              validated_at,
            };
          }

          return {
            valid: false,
            error: fetchError.message,
            domain_match,
            redirect_chain: redirect_chain.length > 0 ? redirect_chain : undefined,
            validated_at,
          };
        }

        return {
          valid: false,
          error: "Unknown fetch error",
          domain_match,
          redirect_chain: redirect_chain.length > 0 ? redirect_chain : undefined,
          validated_at,
        };
      }
    } catch (error) {
      // URL parsing error or other unexpected error
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Unknown error",
        domain_match: false,
        validated_at,
      };
    }
  }

  /**
   * Batch validates multiple URLs with rate limiting
   * @param items - Array of {url, expectedDomain, opportunityId}
   * @returns Map of opportunityId to validation result
   */
  async batchValidate(
    items: ValidationItem[]
  ): Promise<Map<string, SourceValidationResult>> {
    const results = new Map<string, SourceValidationResult>();
    const delayMs = 1000 / this.rateLimit; // Delay between requests

    for (const item of items) {
      const result = await this.validateSourceUrl(item.url, item.expectedDomain);
      results.set(item.opportunityId, result);

      // Rate limiting: wait before next request
      if (items.indexOf(item) < items.length - 1) {
        await this.sleep(delayMs);
      }
    }

    return results;
  }

  /**
   * Checks if actual domain matches expected domain pattern
   * Supports exact match and subdomain matching
   */
  private checkDomainMatch(actualDomain: string, expectedDomain: string): boolean {
    // Normalize domains to lowercase
    const actual = actualDomain.toLowerCase();
    const expected = expectedDomain.toLowerCase();

    // Exact match
    if (actual === expected) {
      return true;
    }

    // Subdomain match (e.g., www.fmrpo.gov.ba matches fmrpo.gov.ba)
    if (actual.endsWith(`.${expected}`)) {
      return true;
    }

    // Check if expected is a subdomain of actual (less common but possible)
    if (expected.endsWith(`.${actual}`)) {
      return true;
    }

    return false;
  }

  /**
   * Sleep utility for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Singleton instance for reuse
 */
export const sourceValidator = new SourceValidator();
