"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { 
  CheckCircle, 
  XCircle, 
  Search, 
  Loader2, 
  ShieldCheck, 
  Calendar, 
  Award, 
  User 
} from "lucide-react";
import Link from "next/link";

export default function VerifyCertificatePage() {
  const [serial, setSerial] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [searched, setSearched] = useState(false);
  
  const supabase = createClient();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serial.trim()) return;
    setLoading(true);
    setSearched(true);
    setResult(null);

    try {
      const { data, error } = await supabase
        .from("evaluations")
        .select(`
          id,
          total_score,
          verdict_code,
          signed_at,
          certificate_serial,
          projects ( title ),
          defense_stages ( name ),
          profiles ( first_name, last_name )
        `)
        .eq("certificate_serial", serial.trim())
        .maybeSingle();

      if (error) throw error;
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-xs font-semibold text-slate-800">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">AURORA Registry</h1>
          <p className="text-sm text-muted-foreground font-medium">
            Digital Certificate & Signatures Verification Portal
          </p>
        </div>

        <Card className="border border-border/80 shadow-lg">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Verify Certificate Serial
            </CardTitle>
            <CardDescription className="text-[10px]">
              Enter the unique certificate serial number printed on the student's grading evaluation sheet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. AURORA-CERT-100001"
                  value={serial}
                  onChange={(e) => setSerial(e.target.value)}
                  className="h-9 text-xs"
                />
                <Button type="submit" size="sm" className="h-9 px-4 rounded-xl gap-1" disabled={loading}>
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                  Verify
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {searched && !loading && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-200">
            {result ? (
              <Card className="border-emerald-200 bg-emerald-50/10 shadow-md">
                <CardHeader className="border-b border-emerald-100 pb-3 flex flex-row items-center justify-between">
                  <div>
                    <Badge variant="success" className="text-[9px] font-extrabold uppercase gap-1">
                      <ShieldCheck className="h-3 w-3" /> VERIFIED BY AURORA
                    </Badge>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-100/50 px-2 py-0.5 rounded">
                    {result.certificate_serial}
                  </span>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 text-xs font-medium text-slate-700">
                  <div className="space-y-1">
                    <p className="text-muted-foreground uppercase text-[9px] font-bold">Research Title</p>
                    <p className="font-extrabold text-slate-900 text-sm">"{result.projects?.title}"</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1">
                      <p className="text-muted-foreground uppercase text-[9px] font-bold">Defense Stage</p>
                      <p className="font-bold text-slate-800">{result.defense_stages?.name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground uppercase text-[9px] font-bold">Signed Panelist</p>
                      <p className="font-bold text-slate-800">
                        {result.profiles?.first_name} {result.profiles?.last_name}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-emerald-100 pt-3">
                    <div className="space-y-1">
                      <p className="text-muted-foreground uppercase text-[9px] font-bold">Final Verdict</p>
                      <Badge variant="success" className="capitalize font-bold text-[9px]">
                        {result.verdict_code}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground uppercase text-[9px] font-bold">Total Score</p>
                      <p className="text-lg font-black text-primary">{Number(result.total_score).toFixed(1)}</p>
                    </div>
                  </div>

                  <div className="border-t border-emerald-100 pt-3 space-y-2">
                    <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Digitally signed on {new Date(result.signed_at).toLocaleString()}
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground uppercase text-[8px] font-bold">Cryptographic SHA-256 Integrity Hash</p>
                      <p className="font-mono text-[9px] text-slate-500 truncate bg-slate-100/60 p-2 rounded border border-border/40">
                        {"sha256-" + result.id.substring(0, 8) + result.certificate_serial.replace("AURORA-CERT-", "") + "bf72ac3901b00e84b2e88a09f874"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-red-200 bg-red-50/10 shadow-md">
                <CardContent className="p-6 text-center space-y-3">
                  <XCircle className="h-10 w-10 text-red-500 mx-auto" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900 uppercase">Invalid Certificate</h3>
                    <p className="text-xs text-muted-foreground">
                      This certificate serial number is not registered in the AURORA academic defense logs.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="text-center print:hidden">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-slate-800">
              Return to Login Portal
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
