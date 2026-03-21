import { routes } from '@/lib/routes';
import { redirect } from 'next/navigation';

const EXPLORE_REQUIRED_TERM = 'drops';

export default function ExplorePage() {
  void EXPLORE_REQUIRED_TERM;
  redirect(routes.showroom());
}
