import AccountGate from '@/components/account/AccountGate';
import AccountDashboard from '@/components/account/AccountDashboard';
export const metadata={title:'My account',description:'Manage your personal details, saved China trips and local guide requests.'};
export default function Account(){return <AccountGate next="/en/account"><AccountDashboard/></AccountGate>;}
