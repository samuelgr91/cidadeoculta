import {LocationFunnelPage,funnelMetadata,type FunnelPageProps} from '@/lib/location-funnel-page';
export const dynamic='force-dynamic';
export const generateMetadata=(props:FunnelPageProps)=>funnelMetadata(props,'pt-br');
export default function Page(props:FunnelPageProps){return LocationFunnelPage(props,'pt-br');}
