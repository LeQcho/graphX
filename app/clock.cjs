'use strict';
// Epoch-shaped timestamps retain protocol compatibility, while elapsed time is monotonic.
function createClock(wall=Date.now,mono=()=>performance.now()){
 const epoch=wall(),start=mono();return ()=>epoch+mono()-start;
}
module.exports={createClock};
