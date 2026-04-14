import { modelConfig, apiEndpoints, activeRole } from '../script.js';
import { updateModelConfig } from './settings.js';
// 這裡將載入我們本地完整的 ai-response-hacked.js 內容。
// 但為了確保萬無一失，我直接讀取本地文件內容並將其轉為 base64 進行更新。
