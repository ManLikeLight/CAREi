import { Router, type ErrorRequestHandler } from "express";
import { authRoutes } from "../ctp/auth-routes";
import { managerRoutes } from "../ctp/manager-routes";
import { portalRoutes } from "../ctp/portal-routes";
import { timingSafeEqual } from "node:crypto";
import { digest } from "../ctp/store";
import { escalateConcerns } from "../ctp/jobs";

const router=Router();
router.post("/ctp/jobs/escalate",async(req,res)=>{
  res.setHeader("Cache-Control","no-store");
  const expected=process.env.CTP_SCHEDULER_TOKEN;
  const supplied=req.header("authorization")?.replace(/^Bearer /,"");
  if(!expected||!supplied||!timingSafeEqual(Buffer.from(digest(expected)),Buffer.from(digest(supplied)))){
    res.status(403).json({error:"A dedicated scheduler credential is required."});return;
  }
  res.json({escalated:await escalateConcerns(),sampleOnly:true});
});
router.use("/ctp",(req,res,next)=>{
  res.setHeader("Cache-Control","no-store, private");
  res.setHeader("Pragma","no-cache");
  res.setHeader("Vary","Cookie, Authorization");
  res.removeHeader("Access-Control-Allow-Origin");
  // Strict is rewritten by the preview proxy: independent CSRF checks are mandatory.
  if(req.header("x-ctp-request")!=="1" || (req.header("sec-fetch-site") && !["same-origin","none"].includes(req.header("sec-fetch-site")!))){
    res.status(403).json({error:"Use the Close to Home application to make this request."});return;
  }
  next();
});
router.use("/ctp/auth",authRoutes);
router.use("/ctp",managerRoutes);
// Manager middleware must only apply to manager routes, not trusted-person paths.
router.use("/ctp",portalRoutes);
const handle:ErrorRequestHandler=(err,_req,res,_next)=>{
  const message=err instanceof Error?err.message:"";
  const expected=/Unknown preset|already has a link|Notify requires|recorded reason|Resolved concerns|Acknowledge this concern/.test(message);
  if(!expected)console.error("Close to Home request failed", {name:err?.name,code:err?.code});
  res.status(expected?400:500).json({error:expected?message:"Close to Home is unavailable. Please try again."});
};
router.use("/ctp",handle);
export default router;
