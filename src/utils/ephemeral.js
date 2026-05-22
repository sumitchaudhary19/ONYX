/**
 * Filters messages based on ephemeral rules:
 * - Text messages expire after 24 hours
 * - Media messages (image, video, audio) expire after 12 hours
 * 
 * @param {Array} messages Array of message objects
 * @returns {Array} Filtered array of valid messages
 */
export function filterEphemeralMessages(messages) {
  if (!messages || !Array.isArray(messages)) return [];
  const now = new Date();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  const TWELVE_HOURS = 12 * 60 * 60 * 1000;

  return messages.filter(msg => {
    if (!msg.created_at) return true;
    const msgDate = new Date(msg.created_at);
    const age = now - msgDate;
    const hasMedia = !!(msg.image_url || msg.video_url || msg.audio_url);
    
    if (hasMedia) {
      return age < TWELVE_HOURS;
    } else {
      return age < TWENTY_FOUR_HOURS;
    }
  });
}

/**
 * Returns a human-readable expiration countdown string or null if expired.
 * @param {Object} msg 
 * @returns {String|null} e.g. "Expires in 2h"
 */
export function getExpirationText(msg) {
  if (!msg.created_at) return null;
  const now = new Date();
  const msgDate = new Date(msg.created_at);
  const age = now - msgDate;
  const hasMedia = !!(msg.image_url || msg.video_url || msg.audio_url);
  
  const limit = hasMedia ? 12 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const remaining = limit - age;
  
  if (remaining <= 0) return null;
  
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const mins = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  
  if (hours > 0) return `Expires in ${hours}h`;
  return `Expires in ${mins}m`;
}
