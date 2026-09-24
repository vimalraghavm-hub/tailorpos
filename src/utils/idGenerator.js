let counter = 0;

/**
 * Generates a stable, collision-free unique ID for React list keys and entities.
 * @param {string} prefix Optional string prefix (e.g. 'toast', 'notif', 'item', 'cust')
 * @returns {string} Unique string key
 */
export const generateUniqueId = (prefix = 'id') => {
  counter += 1;
  return `${prefix}_${Date.now()}_${counter}_${Math.random().toString(36).substring(2, 7)}`;
};
