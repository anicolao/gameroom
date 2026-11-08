// This runs only from main, never from the PR checkout or its artifact.
module.exports=async({github,context,core})=>{
 const fs=require('node:fs'),path=require('node:path');
 core.setOutput('publish','false');
 const id=process.env.PREVIEW_RUN_ID;
 if(!/^[1-9][0-9]*$/.test(id??''))throw Error('Invalid preview run ID.');
 const repo=context.repo,fullName=`${repo.owner}/${repo.repo}`;
 const {data:run}=await github.rest.actions.getWorkflowRun({...repo,run_id:Number(id)});
 if(run.event!=='pull_request'||run.path!=='.github/workflows/pr-preview.yml'||run.status!=='completed'||run.conclusion!=='success'||run.head_repository?.full_name!==fullName)throw Error('Not a successful first-party preview build.');
 const associated=await github.paginate(github.rest.repos.listPullRequestsAssociatedWithCommit,{...repo,commit_sha:run.head_sha,per_page:100});
 const candidates=associated.filter(pr=>pr.head.repo?.full_name===fullName&&pr.head.sha===run.head_sha&&pr.base.ref==='main');
 if(candidates.length!==1){core.info('Preview is stale or its PR is ambiguous; nothing will be published.');return;}
 const pr=candidates[0];
 if(context.eventName==='workflow_run'&&pr.state!=='open'){core.info('PR is no longer open; nothing will be published.');return;}
 const artifacts=await github.paginate(github.rest.actions.listWorkflowRunArtifacts,{...repo,run_id:run.id,per_page:100});
 const matches=artifacts.filter(a=>a.name==='preview-site'&&!a.expired);
 if(matches.length!==1)throw Error('Expected one unexpired preview-site artifact.');
 const artifact=matches[0];
 if(artifact.workflow_run?.head_sha&&artifact.workflow_run.head_sha!==run.head_sha)throw Error('Artifact source does not match preview run.');
 const download=await github.rest.actions.downloadArtifact({...repo,artifact_id:artifact.id,archive_format:'zip'});
 fs.writeFileSync(path.join(process.env.RUNNER_TEMP,'preview.zip'),Buffer.from(download.data),{mode:0o600});
 core.setOutput('pr_number',String(pr.number));core.setOutput('commit',run.head_sha);core.setOutput('publish','true');
};
