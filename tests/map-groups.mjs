import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {groupMapStories,mapPinOffset} from '../lib/map-groups.ts';
import {seedLocations,seedStories} from '../lib/seed.ts';

const oratory={id:'oratory',name:'Oratório',lat:-20.3875,lng:-43.49806};
const house={id:'house',name:'Sobrado',lat:-20.3875,lng:-43.49806};
const museum={id:'museum',name:'Museu',lat:-20.38432,lng:-43.50599};
const stories=[
 {id:'op-005',editorialCode:'OP-005',location:house},
 {id:'op-062',editorialCode:'OP-062',location:museum},
 {id:'op-001',editorialCode:'OP-001',location:oratory},
 {id:'op-002',editorialCode:'OP-002',location:house},
];

const groups=groupMapStories(stories);
assert.equal(groups.length,3,'distinct places must each have a marker');
assert.deepEqual(groups.find(group=>group[0].location.id==='house').map(story=>story.id),['op-002','op-005']);
assert.deepEqual(mapPinOffset(groups,'museum'),[0,0]);
assert.notDeepEqual(mapPinOffset(groups,'house'),mapPinOffset(groups,'oratory'),'shared approximate coordinates must not overlap visually');
assert.deepEqual([house.lat,house.lng],[-20.3875,-43.49806],'visual offset must not change location data');

const batches=['batch-op001-op006.json','batch-op008.json','batch-op061.json','batch-op062.json']
 .map(file=>JSON.parse(readFileSync(new URL(`../content/ouro-preto/${file}`,import.meta.url),'utf8')));
const locations=new Map([...seedLocations,...batches.flatMap(batch=>batch.locations)].map(location=>[location.id,location]));
const currentStories=new Map([...seedStories,...batches.flatMap(batch=>batch.stories)].map(story=>[story.id,story]));
const published=[...currentStories.values()].map(story=>({...story,location:locations.get(story.locationId)}));
assert.equal(published.length,11);
assert.equal(groupMapStories(published).length,7,'every published Ouro Preto location must get its own pin');
console.log('Map groups and overlapping locations passed');
