export function msToTime(ms: number) {
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor(ms / 3600000) % 24;
  const minutes = Math.floor(ms / 60000) % 60;
  const seconds = Math.floor(ms / 1000) % 60;

  const daysStr = days != 0 ? (days == 1 ? `${days} day` : `${days} days`) : "";
  const hoursStr = hours != 0 ? (hours == 1 ? `${hours} hour` : `${hours} hours`) : "";
  const minutesStr = minutes != 0 ? (minutes == 1 ? `${minutes} minute` : `${minutes} minutes`) : "";
  const secondsStr = seconds != 0 ? (seconds == 1 ? `${seconds} second` : `${seconds} seconds`) : "";

  return `${daysStr} ${hoursStr} ${minutesStr} ${secondsStr}`.trim();
}
