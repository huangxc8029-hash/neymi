import {expect,it} from 'vitest';
import {authAvailability,safeAuthReturnTo} from '../../src/modules/auth/config';

it('does not advertise any sign-in method until Supabase public configuration is valid',()=>{
  expect(authAvailability({}).providers).toEqual({email:false,google:false,apple:false});
  expect(authAvailability({NEXT_PUBLIC_SUPABASE_URL:'javascript:alert(1)',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'public'}).configured).toBe(false);
});

it('exposes only explicitly enabled identity providers after Supabase is configured',()=>{
  expect(authAvailability({NEXT_PUBLIC_SUPABASE_URL:'https://project.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'public',NEXT_PUBLIC_AUTH_GOOGLE_ENABLED:'true'})).toEqual({configured:true,providers:{email:true,google:true,apple:false}});
});

it('keeps authentication return paths on this site',()=>{
  expect(safeAuthReturnTo('/vip?step=share')).toBe('/vip?step=share');
  expect(safeAuthReturnTo('//evil.example/path')).toBe('/');
  expect(safeAuthReturnTo('https://evil.example/path')).toBe('/');
});
