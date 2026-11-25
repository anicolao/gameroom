import {packageBga} from './package-bga';
const args=process.argv.slice(2);
const child=Bun.spawn(['bun','x','vite','build',...args],{stdout:'inherit',stderr:'inherit'});
const result=await child.exited;if(result)process.exit(result);
const index=args.indexOf('--outDir');await packageBga(index<0?(args.find(arg=>arg.startsWith('--outDir='))?.slice(9)??'dist'):args[index+1]);
