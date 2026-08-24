import { NextResponse } from 'next/server';

/**
 * Digital Asset Links, for the Trusted Web Activity wrapper.
 *
 * This is what tells Android that the APK signed with the fingerprint below is
 * genuinely ours, and it is the ONLY thing that removes the browser URL bar from
 * the top of the app. Without a matching fingerprint the TWA still runs, but it
 * runs as a visibly branded Chrome tab, which no one will mistake for an app.
 *
 * The fingerprint comes from the signing key created when the Android package is
 * generated. It is a public value — it identifies a key, it is not the key — so
 * it is safe in the repo and in an environment variable alike.
 */
export const dynamic = 'force-static';

const PACKAGE_NAME = 'com.sachmuch.app';

/** SHA-256 of the signing certificate, colon-separated uppercase hex. */
const FINGERPRINT = process.env.ANDROID_CERT_FINGERPRINT ?? '';

export function GET() {
  // An empty array is valid JSON and simply asserts no linked app yet, which is
  // the honest state before the APK is signed. Serving a placeholder fingerprint
  // would silently fail verification and be much harder to diagnose.
  const statements = FINGERPRINT
    ? [
        {
          relation: ['delegate_permission/common.handle_all_urls'],
          target: {
            namespace: 'android_app',
            package_name: PACKAGE_NAME,
            sha256_cert_fingerprints: [FINGERPRINT],
          },
        },
      ]
    : [];

  return NextResponse.json(statements, {
    headers: { 'content-type': 'application/json' },
  });
}
