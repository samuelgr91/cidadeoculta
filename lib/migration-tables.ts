// Order respects the editorial foreign keys. Authentication challenges,
// sessions and lead-gate cookies never move between hosts.
export const migrationTables = [
  { name: 'cities', columns: ['id', 'slug', 'data', 'updated_at'] },
  { name: 'locations', columns: ['id', 'city_id', 'data'] },
  { name: 'stories', columns: ['id', 'city_id', 'location_id', 'data', 'updated_at'] },
  { name: 'story_translations', columns: ['story_id', 'city_id', 'locale', 'slug', 'status'] },
  { name: 'sources', columns: ['id', 'story_id', 'data'] },
  { name: 'leads', columns: ['id', 'session_id', 'email', 'city_id', 'locale', 'consent', 'acquisition', 'created_at'] },
  { name: 'orders', columns: ['id', 'user_id', 'city_id', 'amount', 'currency', 'mode', 'status', 'provider_id', 'created_at', 'updated_at'] },
  { name: 'entitlements', columns: ['id', 'user_id', 'city_id', 'order_id', 'mode', 'active', 'created_at'] },
  { name: 'events', columns: ['id', 'name', 'city_id', 'story_id', 'locale', 'session_id', 'acquisition', 'created_at'] },
  { name: 'progress', columns: ['id', 'user_id', 'story_id', 'completed_at'] },
  { name: 'audit', columns: ['id', 'actor', 'action', 'entity_id', 'created_at'] },
] as const;
