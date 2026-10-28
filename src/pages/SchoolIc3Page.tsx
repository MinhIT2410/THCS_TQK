import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, LockKeyhole } from 'lucide-react';
import { ROUTES } from '../config/routes';
import { useAuth } from '../features/auth/AuthContext';
import { supabase } from '../services/supabaseClient';

type Mode = 'learn' | 'exam';
type Question = { id: string; prompt: string; choices: string[] };
type Feedback = { correct: boolean; correct_index: number; explanation: string; tip: string };
type Result = { score: number; correct_count: number; total: number; feedback: Record<string, Feedback> };
const gradeLevels = [{ value:'6', name:'Khối 6 – Level 1' }, {value:'7',name:'Khối 7 – Level 2'},{value:'8',name:'Khối 8 – Level 3'}];
export default function SchoolIc3Page() {
  const { isAuthenticated } = useAuth();
  const [grade,setGrade] = useState('6');
  const [sets,setSets] = useState<{id:string; title:string; question_count:number}[]>([]);
  const [setId,setSetId] = useState('');
  const [mode,setMode] = useState<Mode>('learn');
  const [questions,setQuestions] = useState<Question[]>([]);
  const [attemptId,setAttemptId] = useState<string | null>(null);
  const [answers,setAnswers] = useState<Record<string,number>>({});
  const [feedback,setFeedback] = useState<Record<string, Feedback>>({});
  const [result,setResult] = useState<Result|null>(null);
  const [index,setIndex] = useState(0);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  useEffect(()=>{
    let alive=true;
    setSets([]);setSetId('');
    void supabase.rpc('ic3_school_list_sets',{p_grade: Number(grade)}).then(({data,error})=>{
      if(alive){if(error) setError(error.message);else {setError('');setSets(Array.isArray(data)?data:[]);}}
    });
    return ()=>{alive=false};
  },[grade]);
  async function begin(){
    if(!isAuthenticated || !setId || busy) return;
    setBusy(true);setError('');setResult(null);setAnswers({});setFeedback({});setIndex(0);
    const {data,error:err}=await supabase.rpc('ic3_school_start',{p_set_id:setId,p_mode:mode});
    if(err){setError(err.message);}else if(data?.attempt_id && Array.isArray(data?.questions)){
      setAttemptId(data.attempt_id);setQuestions(data.questions);
    }else setError('Không nhận được nội dung bài.');
    setBusy(false);
  }
  async function choose(choice:number){
    const q=questions[index];if(!q || answers[q.id]!==undefined || busy || result) return;
    if(mode==='learn'){
      setBusy(true);setError('');
      const {data,error:err}=await supabase.rpc('ic3_school_answer',{p_attempt_id:attemptId,p_question_id:q.id,p_choice:choice});
      setBusy(false);
      if(err){setError(err.message);return;}
      if(data?.feedback){setFeedback(prev=>({...prev,[q.id]:data.feedback}));}
    }
    setAnswers(prev=>({...prev,[q.id]:choice}));
  }
  async function submit(){
    if(!attemptId || busy || Object.keys(answers).length!==questions.length) return;
    setBusy(true);setError('');
    const {data,error:err}=await supabase.rpc('ic3_school_finish',{p_attempt_id:attemptId,p_answers:mode==='exam'?answers:{}});
    if(err)setError(err.message);else if(data)setResult(data as Result);
    setBusy(false);
  }
  const q=questions[index];
  const f=q ? (result?.feedback[q.id] ?? feedback[q.id]) : undefined;
  return <section className="min-h-[75vh] bg-slate-50 dark:bg-slate-950 pb-12">
    <div className="bg-gradient-to-r from-blue-950 to-indigo-800 text-white px-5 py-7"><div className="max-w-6xl mx-auto"><h1 className="text-2xl font-extrabold">Luyện tập IC3 tại trường</h1><p className="text-sm text-indigo-100 mt-1">Học kiến thức – giải thích ngay – kiểm tra và lưu điểm</p></div></div>
    <div className="max-w-6xl mx-auto px-4 pt-6 space-y-4">
      <Link to={ROUTES.INTERNATIONAL_IT} className="inline-flex gap-2 items-center text-blue-700 dark:text-blue-300 text-sm"><ArrowLeft size={16}/>Trở lại Học Tin học quốc tế</Link>
      {!attemptId ? <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border dark:border-slate-800 space-y-4">
        <h2 className="font-bold text-xl">Chọn bài luyện tập tại trường</h2>
        <div className="grid md:grid-cols-2 gap-4"><label className="text-sm font-semibold">Chọn khối<select className="block w-full mt-2 border rounded-lg p-3 bg-white text-slate-900" value={grade} onChange={e=>setGrade(e.target.value)}>{gradeLevels.map(x=><option key={x.value} value={x.value}>{x.name}</option>)}</select></label>
        <label className="text-sm font-semibold">Chọn bài<select className="block w-full mt-2 border rounded-lg p-3 bg-white text-slate-900" value={setId} onChange={e=>setSetId(e.target.value)}><option value="">— Chọn bài —</option>{sets.map(x=><option key={x.id} value={x.id}>{x.title} ({x.question_count} câu)</option>)}</select></label></div>
        {!sets.length&&<p className="text-sm text-amber-700">Khối này chưa có bộ câu hỏi được xuất bản. Nội dung sẽ được bổ sung theo từng khối.</p>}
        <div className="flex flex-wrap gap-4"><label className="flex items-center gap-2"><input type="radio" checked={mode==='learn'} onChange={()=>setMode('learn')}/>Học – giải thích ngay</label><label className="flex items-center gap-2"><input type="radio" checked={mode==='exam'} onChange={()=>setMode('exam')}/>Kiểm tra – chấm khi nộp</label></div>
        {!isAuthenticated&&<p className="text-amber-700 text-sm">Vui lòng đăng nhập tài khoản trường để bắt đầu và lưu lịch sử luyện tập.</p>}
        <button disabled={!isAuthenticated || !setId || busy} onClick={()=>void begin()} className="rounded-xl bg-blue-600 text-white font-bold px-5 py-3 disabled:opacity-50">Bắt đầu</button>
      </div> : <div className="space-y-4">
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3"><div><b>{mode==='learn'?'Chế độ học':'Chế độ kiểm tra'}</b><p className="text-xs text-slate-500">Câu {index+1}/{questions.length} · Đã trả lời {Object.keys(answers).length}/{questions.length}</p></div><div className="flex gap-1">{questions.map((item,i)=><button key={item.id} onClick={()=>setIndex(i)} className={'h-8 w-8 rounded-lg text-xs font-bold '+(i===index?'bg-blue-700 text-white':answers[item.id]!==undefined?'bg-emerald-100 text-emerald-800':'bg-slate-200 text-slate-700')}>{i+1}</button>)}</div></div>
        {q&&<div className="grid md:grid-cols-2 gap-4 items-stretch"><div className="rounded-xl bg-white dark:bg-slate-900 border dark:border-slate-800 p-5 space-y-4"><p className="text-xs font-bold text-blue-600">CÂU {index+1}</p><h2 className="font-bold text-lg">{q.prompt}</h2>{q.choices.map((choice,i)=><button key={i} disabled={answers[q.id]!==undefined || !!result || busy} onClick={()=>void choose(i)} className={'w-full text-left border rounded-xl p-3 disabled:cursor-default '+(answers[q.id]===i?'border-blue-600 bg-blue-50 text-slate-900':'dark:border-slate-700')}>{String.fromCharCode(65+i)}. {choice}</button>)}</div>
        <div className="rounded-xl border dark:border-slate-700 bg-blue-50 dark:bg-slate-900 p-5 space-y-3"><h3 className="font-bold flex items-center gap-2"><BookOpen size={19}/>Giải thích kiến thức</h3>{f?<><p className={f.correct?'text-emerald-700 font-bold':'text-red-600 font-bold'}>{f.correct?'Chính xác!':'Chưa chính xác'}</p><p className="font-semibold">Đáp án: {String.fromCharCode(65+f.correct_index)}. {q.choices[f.correct_index]}</p><p>{f.explanation}</p><div className="border rounded-lg p-3 text-sm"><b>Mẹo ghi nhớ:</b> {f.tip}</div></>:<div className="flex flex-col gap-2 text-slate-500 text-sm">{mode==='exam'?<LockKeyhole size={25}/>:<CheckCircle2 size={25}/>} {mode==='exam'?'Chế độ kiểm tra: giải thích sẽ xuất hiện sau khi nộp.':'Chọn đáp án để xem giải thích tại đây.'}</div>}</div></div>}
        {result&&<div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-emerald-900"><b>Đã nộp thành công – {result.score}/1000 điểm</b><p>{result.correct_count}/{result.total} câu đúng. Kết quả được chấm và lưu từ Supabase. Chọn từng câu để xem giải thích.</p></div>}
        <div className="flex items-center justify-between gap-3"><button disabled={index===0} onClick={()=>setIndex(i=>i-1)} className="rounded-lg border px-3 py-2 disabled:opacity-50"><ChevronLeft size={18}/></button><div className="flex gap-2">{!result&&<button disabled={Object.keys(answers).length!==questions.length||busy} onClick={()=>void submit()} className="rounded-lg bg-emerald-600 text-white px-4 py-2 disabled:opacity-40">Nộp bài</button>}{result&&<button className="rounded-lg bg-blue-600 text-white px-4 py-2" onClick={()=>{setAttemptId(null);setQuestions([]);setResult(null);setFeedback({});setAnswers({})}}>Chọn bài khác</button>}</div><button disabled={index===questions.length-1} onClick={()=>setIndex(i=>i+1)} className="rounded-lg border px-3 py-2 disabled:opacity-50"><ChevronRight size={18}/></button></div>
      </div>}
      {error&&<p role="alert" className="bg-red-50 text-red-700 rounded-lg p-3 text-sm">{error}</p>}
    </div>
  </section>;
}
