/** A release may name its only source file differently after Firebase CLI deploys it. */
function reviewedRulesStatus(files,before,after){
 if(files.length!==1||typeof files[0]?.content!=='string')throw new Error('Review all production rules files before deploying.');
 if(files[0].content===after)return 'current';
 if(files[0].content===before)return 'deploy';
 throw new Error('Production rules changed since review. Read and merge the current rules before deploying.');
}
module.exports={reviewedRulesStatus};
