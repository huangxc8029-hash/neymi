import {makeProfile} from './domain';
export function makeSensitiveProfile(){
  const profile=makeProfile();
  profile.modules[0].items.push({id:'phone',label:'Contact',value:'PRIVATE_SENTINEL',valueKind:'phone',sensitivity:'sensitive'});
  return profile;
}
