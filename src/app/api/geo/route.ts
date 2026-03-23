import { geolocation } from '@vercel/functions';

export function GET(request: Request) {
  const geo = geolocation(request);
  return Response.json(geo);
}