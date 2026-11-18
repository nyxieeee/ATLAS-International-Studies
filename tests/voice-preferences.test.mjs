import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeVoicePreferences} from '../lib/voice-preferences.mjs';
import {emptyWorkspace} from '../lib/workspace-types.ts';
import {normalizeWorkspace,restoreBackup} from '../lib/workspace-migrations.mjs';
test('voice preferences survive cloud normalization and backup restoration',()=>{
 const settings={voice:'en-PH-JamesNeural',counterpart:'en-PH-RosaNeural',rate:1.25};const workspace={...emptyWorkspace(),voiceSettings:settings};assert.deepEqual(normalizeWorkspace(JSON.parse(JSON.stringify(workspace)),emptyWorkspace()).voiceSettings,settings);assert.deepEqual(restoreBackup(JSON.stringify(workspace),emptyWorkspace()).voiceSettings,settings);
});
test('older snapshots and invalid voice settings receive supported defaults',()=>{
 const defaults=normalizeVoicePreferences(null);assert.deepEqual(normalizeWorkspace({notes:[]},emptyWorkspace()).voiceSettings,defaults);assert.deepEqual(normalizeWorkspace({voiceSettings:{voice:'bad',counterpart:'bad',rate:99}},emptyWorkspace()).voiceSettings,defaults);assert.deepEqual(normalizeVoicePreferences('bad'),defaults);
});
