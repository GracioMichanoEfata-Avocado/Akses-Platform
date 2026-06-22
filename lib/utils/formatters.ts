export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} jam`;
  return `${hours} jam ${mins} menit`;
}

export function getDisabilitasLabel(type: string): string {
  const map: Record<string, string> = {
    tunanetra: 'Tunanetra',
    tunarungu: 'Tunarungu',
    both: 'Tunanetra & Tunarungu',
    none: 'Tidak ada',
  };
  return map[type] || type;
}

export function getDisabilitasBadgeColor(type: string): string {
  const map: Record<string, string> = {
    tunanetra: 'bg-purple-100 text-purple-800',
    tunarungu: 'bg-blue-100 text-blue-800',
    both: 'bg-red-100 text-red-800',
    none: 'bg-gray-100 text-gray-800',
  };
  return map[type] || 'bg-gray-100 text-gray-800';
}

export function getModeLabel(mode: string): string {
  const map: Record<string, string> = {
    audio: 'Audio Deskriptif',
    visual: 'Visual Deskriptif',
    both: 'Audio & Visual',
  };
  return map[mode] || mode;
}

export function getStatusBadgeColor(status: string): string {
  const map: Record<string, string> = {
    live: 'bg-red-100 text-red-700',
    scheduled: 'bg-blue-100 text-blue-700',
    done: 'bg-green-100 text-green-700',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    live: 'LIVE',
    scheduled: 'Terjadwal',
    done: 'Selesai',
  };
  return map[status] || status;
}

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatTime(timeString: string): string {
  return timeString + ' WIB';
}
