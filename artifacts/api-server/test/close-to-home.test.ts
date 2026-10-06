import test from "node:test";
import assert from "node:assert/strict";
import { allowed,emptyFlags,identityLabel,presetPermissions } from "../src/ctp/permissions";
import { validateStory,templateStory,type Source } from "../src/ctp/story-validator";

test("default deny, expiry, suspension, revocation and wishes override all flags",()=>{
  const open={can_view:true,can_contribute:true,can_notify:true,client_restricted:false};
  assert.equal(allowed({status:"active",expires_at:null},undefined,"view"),false);
  assert.equal(allowed({status:"active",expires_at:null},emptyFlags(),"view"),false);
  for(const status of ["suspended","revoked","expired"])for(const action of ["view","contribute","notify"] as const)assert.equal(allowed({status,expires_at:null},open,action),false);
  for(const action of ["view","contribute","notify"] as const){
    assert.equal(allowed({status:"active",expires_at:new Date(0)},open,action),false);
    assert.equal(allowed({status:"active",expires_at:null},{...open,client_restricted:true},action),false);
  }
  assert.equal(allowed({status:"active",expires_at:null},{...open,can_view:false},"notify"),false);
  assert.equal(presetPermissions("limited").medication.can_view,false);
});
test("carer identity requires all three gates, with independent photo privacy",()=>{
  for(const agency of [true,false])for(const show_name of [true,false])for(const permission of [true,false]){
    const got=identityLabel(agency,{show_name,show_photo:false,name:"Alex",photo:"sample.png"},permission,4);
    assert.equal(got.label,agency&&show_name&&permission?"Alex":"A carer they have seen 4 times this month");
    assert.equal("photo" in got,false);
  }
  assert.equal(identityLabel(true,{show_name:true,show_photo:true,name:"Alex",photo:"sample.png"},true,1).photo,"sample.png");
});
test("story grounding rejects invented IDs, cross-visit IDs, mixed categories and medical inference",()=>{
  const sources:Source[]=[
    {id:"meal",visit_id:"v",category:"meals",source_type:"meal",value:"breakfast prepared"},
    {id:"med",visit_id:"v",category:"medication",source_type:"medication",value:"dose recorded as taken"},
    {id:"other",visit_id:"other-v",category:"meals",source_type:"meal",value:"lunch"},
  ];
  assert.equal(validateStory({sentences:templateStory(sources.filter(s=>s.visit_id==="v"))},"v",sources).length,2);
  for(const sentence of [
    {text:"A meal.",category:"meals",source_ids:["invented"]},
    {text:"A meal.",category:"meals",source_ids:["other"]},
    {text:"A meal and medication.",category:"meals",source_ids:["meal","med"]},
    {text:"They are probably healthy.",category:"meals",source_ids:["meal"]},
  ])assert.throws(()=>validateStory({sentences:[sentence]},"v",sources));
  const got=validateStory({sentences:[...templateStory(sources.slice(0,1)),{text:"Unsupported reassurance",category:"observations",source_ids:[]}]},"v",sources);
  assert.equal(got.length,1);
});
