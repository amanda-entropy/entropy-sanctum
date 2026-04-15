const fs = require('fs');
const path = require('path');

const targetFiles = [
    path.join(__dirname, 'couple-space.js'),
    path.join(__dirname, 'modules', 'werewolf.js'),
    path.join(__dirname, 'modules', 'douban.js'),
    path.join(__dirname, 'modules', 'cphone.js'),
    path.join(__dirname, 'modules', 'misc-features.js'),
    path.join(__dirname, 'modules', 'memory-summary.js')
];

let totalReplaced = 0;

targetFiles.forEach(targetFile => {
    try {
        if (!fs.existsSync(targetFile)) {
            console.log(`Skipping ${path.basename(targetFile)} (Not found)`);
            return;
        }
        
        let content = fs.readFileSync(targetFile, 'utf8');
        let fileReplacedCount = 0;

        // 我們使用更寬鬆的字串替換，來處理 couple-space.js 中那些常見的屎山代碼
        
        // Pattern 1 (return JSON.parse)
        const oldStr1 = `const raw = getGeminiResponseText(respData).replace(/^\\`\\`\\`json\\s*/, '').replace(/\\`\\`\\`$/, '').trim();\nreturn JSON.parse(raw);`;
        const newStr1 = `const raw = getGeminiResponseText(respData);\nreturn extractAndParseJSON(raw);`;
        
        // Pattern 2 (const result = JSON.parse)
        const oldStr2 = `const raw = getGeminiResponseText(respData).replace(/^\\`\\`\\`json\\s*/, '').replace(/\\`\\`\\`$/, '').trim();\nconst result = JSON.parse(raw);`;
        const newStr2 = `const raw = getGeminiResponseText(respData);\nconst result = extractAndParseJSON(raw);`;

        // Pattern 3 (const raw = ... \n const result = ...) - for some variations with indentation
        // To be safe, let's use regex for the couple-space.js specific patterns since indentation might vary.
        
        const regex1 = /const\s+raw\s*=\s*getGeminiResponseText\(([^)]+)\)\.replace\(\/\^```json\\s\*\/\,\s*''\)\.replace\(\/```\$\/\,\s*''\)\.trim\(\);\s*return\s*JSON\.parse\(raw\);/g;
        
        let newContent = content.replace(regex1, (match, p1) => {
            fileReplacedCount++;
            return `const raw = getGeminiResponseText(${p1});\nreturn extractAndParseJSON(raw);`;
        });
        
        const regex2 = /const\s+raw\s*=\s*getGeminiResponseText\(([^)]+)\)\.replace\(\/\^```json\\s\*\/\,\s*''\)\.replace\(\/```\$\/\,\s*''\)\.trim\(\);\s*const\s+result\s*=\s*JSON\.parse\(raw\);/g;
        
        newContent = newContent.replace(regex2, (match, p1) => {
            fileReplacedCount++;
            return `const raw = getGeminiResponseText(${p1});\nconst result = extractAndParseJSON(raw);`;
        });
        
        // Fallback simple string replace just in case regex misses due to weird spacing
        if (fileReplacedCount === 0) {
            let tempContent = content.split(`const raw = getGeminiResponseText(respData).replace(/^${'`'.repeat(3)}json\\s*/, '').replace(/${'`'.repeat(3)}$/, '').trim();`).join(`const raw = getGeminiResponseText(respData);`);
            tempContent = tempContent.split(`return JSON.parse(raw);`).join(`return extractAndParseJSON(raw);`);
            if (tempContent !== content) {
                // Not precise enough, skipping this fallback to avoid breaking other things
            }
        }
        
        // A more robust regex for the exact multi-line pattern in couple-space.js
        const robustRegex = /const\s+raw\s*=\s*getGeminiResponseText\((.*?)\)\.replace\(\/\^```json\\s\*\/\s*,\s*''\)\.replace\(\/```\$\/\s*,\s*''\)\.trim\(\);\s*(return|const\s+result\s*=)\s*JSON\.parse\(\s*raw\s*\);/gm;
        
        newContent = content.replace(robustRegex, (match, p1, p2) => {
             fileReplacedCount++;
             if (p2 === 'return') {
                 return `const raw = getGeminiResponseText(${p1});\nreturn extractAndParseJSON(raw);`;
             } else {
                 return `const raw = getGeminiResponseText(${p1});\nconst result = extractAndParseJSON(raw);`;
             }
        });

        if (fileReplacedCount > 0) {
            fs.writeFileSync(targetFile, newContent, 'utf8');
            totalReplaced += fileReplacedCount;
            console.log(`[SUCCESS] Removed ${fileReplacedCount} fragile JSON parses from ${path.basename(targetFile)}`);
        } else {
            console.log(`[INFO] No targets found or matched in ${path.basename(targetFile)}`);
        }

    } catch (e) {
        console.error(`[ERROR] Surgery failed on ${path.basename(targetFile)}:`, e);
    }
});

console.log(`\n--- GLOBAL SURGERY COMPLETE ---`);
console.log(`Total tumors eradicated: ${totalReplaced}`);