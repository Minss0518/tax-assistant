import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 2024년 기준 종합소득세 세율 구간
const TAX_BRACKETS = [
  { limit: 14000000,   rate: 0.06, deduction: 0 },
  { limit: 50000000,   rate: 0.15, deduction: 1260000 },
  { limit: 88000000,   rate: 0.24, deduction: 5760000 },
  { limit: 150000000,  rate: 0.35, deduction: 15440000 },
  { limit: 300000000,  rate: 0.38, deduction: 19940000 },
  { limit: 500000000,  rate: 0.40, deduction: 25940000 },
  { limit: 1000000000, rate: 0.42, deduction: 35940000 },
  { limit: Infinity,   rate: 0.45, deduction: 65940000 },
];

const PENSION_RATE = 0.09;
const HEALTH_RATE = 0.0709;
const LONGCARE_RATE = 0.1295; // 장기요양 = 건강보험료 × 12.95%
const PENSION_MAX_INCOME = 61700000;

function calcIncomeTax(taxableIncome) {
  if (taxableIncome <= 0) return 0;
  for (const b of TAX_BRACKETS) {
    if (taxableIncome <= b.limit) {
      return Math.max(0, Math.floor(taxableIncome * b.rate - b.deduction));
    }
  }
  return 0;
}

const INPUT_CLASS = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200";
const LABEL_CLASS = "block text-xs font-semibold text-gray-500 mb-1";

export default function TaxCalculatorPage() {
  const navigate = useNavigate();

  const [income, setIncome]                       = useState('');
  const [expense, setExpense]                     = useState('');
  const [basicDeduction, setBasicDeduction]       = useState('1500000');
  const [autoInsurance, setAutoInsurance]         = useState(true);
  const [pensionDeduction, setPensionDeduction]   = useState('');
  const [healthDeduction, setHealthDeduction]     = useState('');
  const [otherDeduction, setOtherDeduction]       = useState('');
  const [result, setResult]                       = useState(null);

  const handleCalculate = () => {
    const incomeNum  = parseInt(income)  || 0;
    const expenseNum = parseInt(expense) || 0;
    const basicNum   = parseInt(basicDeduction) || 0;
    const otherNum   = parseInt(otherDeduction) || 0;

    const netIncome = Math.max(0, incomeNum - expenseNum);

    let pensionNum, healthNum, longcareNum;
    if (autoInsurance) {
      const pensionBase = Math.min(netIncome, PENSION_MAX_INCOME);
      pensionNum  = Math.floor(pensionBase * PENSION_RATE);
      healthNum   = Math.floor(netIncome * HEALTH_RATE);
      longcareNum = Math.floor(healthNum * LONGCARE_RATE);
    } else {
      pensionNum  = parseInt(pensionDeduction) || 0;
      healthNum   = parseInt(healthDeduction)  || 0;
      longcareNum = 0;
    }

    const insuranceTotal = pensionNum + healthNum + longcareNum;
    const totalDeduction = basicNum + insuranceTotal + otherNum;
    const taxableIncome  = Math.max(0, netIncome - totalDeduction);

    const incomeTax         = calcIncomeTax(taxableIncome);
    const standardTaxCredit = 70000; // 표준세액공제
    const finalIncomeTax    = Math.max(0, incomeTax - standardTaxCredit);
    const localTax          = Math.floor(finalIncomeTax * 0.1);
    const totalTax          = finalIncomeTax + localTax;
    const withheld          = Math.floor(incomeNum * 0.033);
    const isRefund          = totalTax < withheld;
    const finalTax          = Math.abs(totalTax - withheld);

    const r = {
      incomeNum, expenseNum, netIncome,
      pensionNum, healthNum, longcareNum, insuranceTotal,
      basicNum, otherNum, totalDeduction, taxableIncome,
      incomeTax, standardTaxCredit, finalIncomeTax,
      localTax, totalTax, withheld, isRefund, finalTax,
    };
    setResult(r);

    localStorage.setItem('lastTaxResult', JSON.stringify({
      grossIncome: incomeNum, totalTax, finalTax, isRefund,
      refundAmount: isRefund ? finalTax : 0,
      calculatedAt: new Date().toLocaleDateString('ko-KR'),
    }));
  };

  const handleReset = () => {
    setIncome(''); setExpense('');
    setBasicDeduction('1500000');
    setPensionDeduction(''); setHealthDeduction(''); setOtherDeduction('');
    setAutoInsurance(true); setResult(null);
  };

  const fmt = (n) => (n ?? 0).toLocaleString();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">

        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate('/dashboard')}
            className="text-gray-400 hover:text-gray-600 transition">← 뒤로</button>
          <h1 className="text-xl font-bold text-gray-800">🧮 종합소득세 계산기</h1>
        </div>
        <p className="text-xs text-gray-400 mb-6 ml-1">2024년 귀속 기준 · 참고용이며 실제 세액과 다를 수 있어요</p>

        {/* 수입 / 경비 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <h2 className="font-bold text-gray-700 mb-4">💰 수입 / 경비</h2>
          <div className="flex flex-col gap-3">
            <div>
              <label className={LABEL_CLASS}>총 수입금액 (연간)</label>
              <input className={INPUT_CLASS} type="number" placeholder="예: 30000000"
                value={income} onChange={(e) => setIncome(e.target.value)} />
            </div>
            <div>
              <label className={LABEL_CLASS}>필요경비 (장비, 재료, 교통비 등)</label>
              <input className={INPUT_CLASS} type="number" placeholder="예: 5000000"
                value={expense} onChange={(e) => setExpense(e.target.value)} />
            </div>
          </div>
        </div>

        {/* 소득공제 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <h2 className="font-bold text-gray-700 mb-4">🎁 소득공제</h2>
          <div className="flex flex-col gap-3">
            <div>
              <label className={LABEL_CLASS}>기본공제 (본인 150만 + 부양가족 1인당 150만)</label>
              <input className={INPUT_CLASS} type="number"
                value={basicDeduction} onChange={(e) => setBasicDeduction(e.target.value)} />
            </div>

            {/* 보험료 자동/수동 토글 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={LABEL_CLASS + ' mb-0'}>국민연금 · 건강보험료</label>
                <div className="flex gap-1">
                  <button onClick={() => setAutoInsurance(true)}
                    className={`text-xs px-3 py-1 rounded-lg font-semibold transition ${autoInsurance ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    자동계산
                  </button>
                  <button onClick={() => setAutoInsurance(false)}
                    className={`text-xs px-3 py-1 rounded-lg font-semibold transition ${!autoInsurance ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    직접입력
                  </button>
                </div>
              </div>
              {autoInsurance ? (
                <div className="bg-blue-50 rounded-xl px-4 py-3 text-xs text-blue-500 space-y-0.5">
                  <p>• 국민연금: 사업소득 × 9% (상한 6,170만원)</p>
                  <p>• 건강보험: 사업소득 × 7.09%</p>
                  <p>• 장기요양: 건강보험료 × 12.95%</p>
                  <p className="text-blue-400 mt-1">수입·경비 입력 후 자동으로 계산돼요</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <input className={INPUT_CLASS} type="number" placeholder="국민연금 납부액 (원)"
                    value={pensionDeduction} onChange={(e) => setPensionDeduction(e.target.value)} />
                  <input className={INPUT_CLASS} type="number" placeholder="건강보험료 납부액 (원)"
                    value={healthDeduction} onChange={(e) => setHealthDeduction(e.target.value)} />
                </div>
              )}
            </div>

            <div>
              <label className={LABEL_CLASS}>기타공제 (기부금, 신용카드 등 실제 공제액)</label>
              <input className={INPUT_CLASS} type="number" placeholder="예: 500000"
                value={otherDeduction} onChange={(e) => setOtherDeduction(e.target.value)} />
            </div>
          </div>
        </div>

        {/* 자동 세액공제 안내 */}
        <div className="bg-violet-50 rounded-2xl px-4 py-3 mb-4 text-xs text-violet-500">
          <p className="font-semibold mb-1">✨ 자동 적용 세액공제</p>
          <p>• 표준세액공제 70,000원 (사업소득자 기준) 자동 반영</p>
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={handleCalculate}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold text-sm transition">
            계산하기
          </button>
          <button onClick={handleReset}
            className="px-5 bg-gray-100 hover:bg-gray-200 text-gray-500 py-3 rounded-xl font-semibold text-sm transition">
            초기화
          </button>
        </div>

        {/* 결과 */}
        {result && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-bold text-gray-700 mb-4">📋 계산 결과</h2>

            {/* 소득 계산 흐름 */}
            <div className="flex flex-col gap-0 mb-4">
              {[
                { label: '총 수입금액',           value: fmt(result.incomeNum),                           color: 'text-gray-700' },
                { label: '(-) 필요경비',           value: `-${fmt(result.expenseNum)}`,                    color: 'text-red-400' },
                { label: '= 사업소득금액',         value: fmt(result.netIncome),                           bold: true },
                { label: '(-) 기본공제',           value: `-${fmt(result.basicNum)}`,                      color: 'text-red-400' },
                { label: '(-) 국민연금',           value: `-${fmt(result.pensionNum)}`,                    color: 'text-red-400' },
                { label: '(-) 건강보험+장기요양',  value: `-${fmt(result.healthNum + result.longcareNum)}`, color: 'text-red-400' },
                { label: '(-) 기타공제',           value: `-${fmt(result.otherNum)}`,                      color: 'text-red-400' },
                { label: '= 과세표준',             value: fmt(result.taxableIncome),                       bold: true },
              ].map((row, i) => (
                <div key={i} className={`flex justify-between text-sm py-2 border-b border-gray-50 last:border-0 ${row.bold ? 'font-semibold' : ''}`}>
                  <span className="text-gray-500">{row.label}</span>
                  <span className={row.color || 'text-gray-700'}>{row.value}원</span>
                </div>
              ))}
            </div>

            {/* 세액 계산 */}
            <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-2 mb-4">
              {[
                { label: '산출세액 (소득세)',      value: fmt(result.incomeTax) },
                { label: '(-) 표준세액공제',       value: `-${fmt(result.standardTaxCredit)}`, color: 'text-blue-500' },
                { label: '= 결정세액',             value: fmt(result.finalIncomeTax),          bold: true },
                { label: '(+) 지방소득세 (10%)',   value: fmt(result.localTax) },
                { label: '총 납부세액',            value: fmt(result.totalTax),                bold: true },
                { label: '(-) 기납부세액 (3.3%)',  value: `-${fmt(result.withheld)}`,          color: 'text-blue-500' },
              ].map((row, i) => (
                <div key={i} className={`flex justify-between text-sm py-1 ${row.bold ? 'font-semibold' : ''}`}>
                  <span className="text-gray-500">{row.label}</span>
                  <span className={row.color || 'text-gray-700'}>{row.value}원</span>
                </div>
              ))}
            </div>

            {/* 최종 결과 */}
            <div className={`rounded-xl p-4 text-center ${result.isRefund ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
              <p className="text-sm text-gray-500 mb-1">
                {result.isRefund ? '🎉 예상 환급세액' : '⚠️ 예상 추가납부세액'}
              </p>
              <p className={`text-2xl font-bold ${result.isRefund ? 'text-green-500' : 'text-red-500'}`}>
                {fmt(result.finalTax)}원
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {result.isRefund
                  ? '5월 종합소득세 신고 시 환급받을 수 있어요'
                  : '5월 종합소득세 신고 시 추가로 납부해야 해요'}
              </p>
            </div>

            {/* 절세 팁 */}
            <div className="mt-4 p-4 bg-blue-50 rounded-xl">
              <p className="text-xs font-semibold text-blue-600 mb-1">💡 절세 팁</p>
              <p className="text-xs text-blue-500">
                노트북, 소프트웨어 구독, 교육비, 통신비 일부, 업무용 카페 비용도 경비 처리 가능해요.
                경비를 꼼꼼히 기록할수록 절세 효과가 커져요.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
