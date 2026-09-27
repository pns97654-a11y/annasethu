const STYLES: Record<string, string> = {
  AVAILABLE: 'bg-leaf-100 text-leaf-800',
  REQUESTED: 'bg-amber-100 text-amber-800',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  PICKED_UP: 'bg-indigo-100 text-indigo-800',
  EN_ROUTE_TO_PICKUP: 'bg-blue-100 text-blue-800',
  EN_ROUTE_TO_DROPOFF: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-gray-200 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-700',
  PENDING: 'bg-amber-100 text-amber-800',
  PENDING_ASSIGNMENT: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-leaf-100 text-leaf-800',
  REJECTED: 'bg-red-100 text-red-700',
  VERIFIED: 'bg-leaf-100 text-leaf-800'
};

export default function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? 'bg-gray-100 text-gray-700';
  return <span className={`badge ${style}`}>{status.replaceAll('_', ' ')}</span>;
}
