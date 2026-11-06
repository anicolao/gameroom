import {existsSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
export const cribbagePath=resolve(process.env.CRIBBAGE_PATH??'../cribbage-gameroom');
export const cantstopPath=resolve(process.env.CANTSTOP_PATH??'../cantstop');
export const localEnv={...process.env,VITE_FIREBASE_API_KEY:'fake-api-key',VITE_FIREBASE_AUTH_DOMAIN:'demo-gameroom.firebaseapp.com',VITE_FIREBASE_PROJECT_ID:'demo-gameroom',VITE_FIREBASE_APP_ID:'demo-gameroom-app',VITE_USE_FIREBASE_EMULATORS:'true',VITE_CRIBBAGE_URL:'http://127.0.0.1:4397/',VITE_CANTSTOP_URL:'http://127.0.0.1:4499/',VITE_EMULATOR_HOST:'127.0.0.1',VITE_CATALOGUE_FIREBASE_API_KEY:'fake-api-key',VITE_CATALOGUE_FIREBASE_AUTH_DOMAIN:'demo-gameroom-catalogue.firebaseapp.com',VITE_CATALOGUE_FIREBASE_PROJECT_ID:'demo-gameroom-catalogue',VITE_CATALOGUE_FIREBASE_APP_ID:'demo-gameroom-catalogue-app',VITE_CATALOGUE_USE_FIREBASE_EMULATORS:'true',VITE_CATALOGUE_ASSET_ORIGIN:'http://127.0.0.1:4199/'};
export const cribbageEnv={...localEnv,VITE_FIREBASE_PROJECT_ID:'demo-cribbage',VITE_FIREBASE_AUTH_DOMAIN:'demo-cribbage.firebaseapp.com',VITE_FIREBASE_APP_ID:'demo-cribbage-app',PUBLIC_BASE_PATH:'/',VITE_PREVIEW_ID:'gameroom'};
export async function javaEnv(){
 if(process.env.JAVA_HOME)return {...process.env,PATH:`${process.env.JAVA_HOME}/bin:${process.env.PATH}`};
 if(process.platform!=='darwin')return {...process.env};
 // Nix shells already set JAVA_HOME; also support a Bun launched outside that shell.
 if(existsSync('/nix/store'))for(const path of readdirSync('/nix/store').filter(name=>name.includes('jdk-21'))){const home=`/nix/store/${path}`;if(existsSync(`${home}/bin/java`))return {...process.env,JAVA_HOME:home,PATH:`${home}/bin:${process.env.PATH}`};}
 return {...process.env};
}
