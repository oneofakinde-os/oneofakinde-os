import { commerceBffService } from "@/lib/bff/service";
import { getRequiredRouteParam, notFound, ok, type RouteContext } from "@/lib/bff/http";

type Params = {
  cert_id: string;
};

/**
 * GET /api/v1/certificates/:cert_id/wallets
 *
 * Returns the verified on-chain wallets that back this certificate's current owner.
 * Public-safe: only exposes address, chain, label, and verifiedAt — never accountId.
 * Returns 404 if the certificate does not exist.
 */
export async function GET(_request: Request, context: RouteContext<Params>) {
  const certId = await getRequiredRouteParam(context, "cert_id");
  if (!certId) {
    return notFound("certificate not found");
  }

  const wallets = await commerceBffService.getCertificateWallets(certId);

  // If the certificate itself is unknown the service returns []; we still want a 404.
  const certificate = await commerceBffService.getCertificateById(certId);
  if (!certificate) {
    return notFound("certificate not found");
  }

  return ok({ wallets });
}
