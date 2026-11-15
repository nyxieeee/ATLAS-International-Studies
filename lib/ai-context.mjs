import {AsyncLocalStorage} from 'node:async_hooks';
const context=new AsyncLocalStorage();
export const withAiAccount=(account,run)=>context.run(account,run);
export const aiAccount=()=>context.getStore();
