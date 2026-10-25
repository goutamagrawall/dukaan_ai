import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
export default defineConfig({
 root:root+'web',
 base:'/dukaan_ai/',
 plugins:[react()],
 resolve:{alias:{'@':root}},
 publicDir:root+'public',
 build:{outDir:root+'docs',emptyOutDir:true},
 server:{host:'127.0.0.1',port:5173},
 preview:{host:'127.0.0.1',port:4173}
});

