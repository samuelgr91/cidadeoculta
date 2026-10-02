type MapLocation={id:string;name:string;lat:number;lng:number};
type MapStory={id:string;location:MapLocation;editorialCode?:string};

export function groupMapStories<T extends MapStory>(stories:T[]):T[][] {
 const groups=new Map<string,T[]>();
 for(const story of stories){
  const group=groups.get(story.location.id)||[];
  group.push(story);
  groups.set(story.location.id,group);
 }
 return [...groups.values()]
  .map(group=>group.sort((a,b)=>(a.editorialCode||a.id).localeCompare(b.editorialCode||b.id,'pt-BR')))
  .sort((a,b)=>a[0].location.lng-b[0].location.lng||a[0].location.lat-b[0].location.lat||a[0].location.name.localeCompare(b[0].location.name,'pt-BR'));
}

// Heritage sites can share an approximate coordinate. Offset only their
// buttons on screen; stored locations and navigation links stay untouched.
export function mapPinOffset<T extends MapStory>(groups:T[][],locationId:string):[number,number] {
 const group=groups.find(items=>items[0]?.location.id===locationId);
 if(!group)return [0,0];
 const {lat,lng}=group[0].location;
 const neighbours=groups.filter(items=>items[0].location.lat===lat&&items[0].location.lng===lng);
 if(neighbours.length<2)return [0,0];
 const index=neighbours.findIndex(items=>items[0].location.id===locationId);
 return [Math.round((index-(neighbours.length-1)/2)*42),0];
}
