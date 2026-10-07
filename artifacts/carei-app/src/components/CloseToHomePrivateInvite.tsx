import { useState, type FormEvent } from "react";
import type { Link } from "@/lib/closeToHome";
import type { CtpInviteAcknowledgement } from "@workspace/api-client-react";

type Mut = <T>(path:string,method:string,body?:unknown)=>Promise<T>;
type Run = (fn:()=>Promise<unknown>,message:string)=>Promise<void>;
export default function PrivateInvite({link,agency,configured,busy,run,mut}:{
  link:Link;agency:string;configured:boolean;busy:boolean;run:Run;mut:Mut;
}) {
  const [confirmed,setConfirmed]=useState(false);
  const [key,setKey]=useState("");
  const [message,setMessage]=useState("");
  async function send(e:FormEvent) {
    e.preventDefault();
    const approval=key;
    setKey("");setMessage("");
    await run(async()=>{
      const result=await mut<CtpInviteAcknowledgement>(`/links/${encodeURIComponent(link.id)}/invite`,"POST",{
        recipientVerified:true,operatorKey:approval,
      });
      setMessage(result.message);setConfirmed(false);
    },"Private invite request completed.");
  }
  return <section className="cth-card" data-testid={`private-delivery-${link.id}`}>
    <h3>Private invitation: {link.personName}</h3>
    <p className="cth-muted">Only separately approved operators can send. Verify identity, relationship and address outside CAREi before sending. The address is fixed by the trusted verification registry; no code is shown to staff.</p>
    <p className="cth-muted">Verification registry references: agency <code>{agency}</code>; trusted person <code>{link.trustedPersonId}</code>.</p>
    {!configured && <p role="status">Private delivery is disabled until an approved email provider is configured.</p>}
    {link.status!=="active" && <p>Restore authorised access separately before issuing an invite.</p>}
    <form onSubmit={e=>void send(e)}>
      <label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} disabled={busy||!configured||link.status!=="active"}
        data-testid={`verify-recipient-${link.id}`} />I have verified this recipient and confirmed the registry's delivery address privately.</label>
      <label htmlFor={`operator-key-${link.id}`}>Separate operator approval key (not a staff PIN)</label>
      <input id={`operator-key-${link.id}`} type="password" autoComplete="off" minLength={32} maxLength={256} required
        value={key} onChange={e=>setKey(e.target.value)} disabled={busy||!configured||link.status!=="active"} />
      <button className="cth-btn primary" disabled={busy||!configured||!confirmed||key.length<32||link.status!=="active"}
        data-testid={`send-private-invite-${link.id}`}>{busy?"Sending…":"Send / resend private code"}</button>
      <p className="cth-muted">Wait five minutes between sends. Codes expire in 24 hours. Sending does not change access permissions or end an existing session.</p>
      {message && <p role="status">{message}</p>}
    </form>
  </section>;
}
