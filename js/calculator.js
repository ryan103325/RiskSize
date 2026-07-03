// 台股現股當沖倉位計算核心邏輯（純函式，不碰 DOM）

export const DEFAULT_RATES = {
  baseFeeRate: 0.001425, // 單邊手續費率基準 0.1425%
  taxRate: 0.0015,       // 現股當沖證交稅率 0.15%（優惠稅率，適用至民國116年12月31日）
};

export const DEFAULT_INPUTS = {
  riskThousand: null,
  direction: 'long',
  entry: null,
  stop: null,
  rr: 2,
  feeDiscount: 6,
};

/**
 * 驗證輸入，回傳錯誤訊息陣列（空陣列 = 通過）
 */
export function validate(inputs) {
  const errors = [];
  const { riskThousand, direction, entry, stop, rr, feeDiscount } = inputs;

  if (!(riskThousand > 0)) errors.push('風險金額必須大於 0');
  if (!(entry > 0)) errors.push('進場價必須大於 0');
  if (!(stop > 0)) errors.push('止損價必須大於 0');
  if (errors.length) return errors;

  if (stop === entry) errors.push('止損價不可等於進場價');
  else if (direction === 'long' && stop > entry) errors.push('做多時止損價不可高於進場價');
  else if (direction === 'short' && stop < entry) errors.push('做空時止損價不可低於進場價');

  if (!(rr > 0)) errors.push('盈虧比必須大於 0');
  if (!(feeDiscount >= 1 && feeDiscount <= 10)) errors.push('手續費折數須介於 1～10 折');

  return errors;
}

/**
 * 依規格書計算倉位。呼叫前應先通過 validate()。
 * @returns {object} 計算結果；若可持有張數為 0，result.error 會帶阻斷訊息
 */
export function calculate(inputs, rates = DEFAULT_RATES) {
  const { riskThousand, direction, entry, stop, rr, feeDiscount } = inputs;
  const feeRate = rates.baseFeeRate * (feeDiscount / 10); // 單邊手續費率
  const taxRate = rates.taxRate;
  const isLong = direction === 'long';

  const stopDistance = Math.abs(entry - stop);

  // 止損出場單股交易成本（做多止損視同賣出、做空止損視同買回）
  const stopCostPerShare = isLong
    ? entry * feeRate + stop * (feeRate + taxRate)
    : entry * (feeRate + taxRate) + stop * feeRate;

  const costPerLot = stopCostPerShare * 1000;      // 單張成本（元）
  const stopLossPerLot = stopDistance * 1000;       // 單張止損金額（元）
  const totalRiskPerLot = stopLossPerLot + costPerLot; // 單張總風險（元）

  const riskBudget = riskThousand * 1000;           // 風險金額（元）
  const lots = Math.floor(riskBudget / totalRiskPerLot); // 可持有張數（無條件捨去）

  if (lots === 0) {
    return {
      error: '風險金額不足以承擔 1 張的止損距離，請提高風險金額或縮小止損距離',
      totalRiskPerLot,
    };
  }

  // 止盈價位：以「扣除費用後的淨損益」反推，使 淨獲利 = 盈虧比 × 淨虧損。
  // 做多解 (T−進場) − 進場×費率 − T×(費率+稅率) = rr × 單股總風險
  // 做空解 (進場−T) − 進場×(費率+稅率) − T×費率 = rr × 單股總風險
  const riskPerShare = totalRiskPerLot / 1000; // 單股總風險（止損距離 + 費用）
  const target = isLong
    ? (entry * (1 + feeRate) + rr * riskPerShare) / (1 - feeRate - taxRate)
    : (entry * (1 - feeRate - taxRate) - rr * riskPerShare) / (1 + feeRate);

  const capitalRequired = lots * entry * 1000;      // 部位所需資金（元）
  const actualRisk = lots * totalRiskPerLot;        // 實際動用風險金額（元）
  const riskDiff = riskBudget - actualRisk;         // 與設定風險金額的差額

  // 止盈價已含費用反推，故淨浮盈精確等於 盈虧比 × 實際動用風險
  const expectedProfit = rr * actualRisk;

  return {
    lots,
    target,
    capitalRequired,
    actualRisk,
    riskDiff,
    expectedLoss: actualRisk, // 預期虧損 = 實際動用風險金額（已含費用）
    expectedProfit,
    totalRiskPerLot,
    feeRate,
    stopDistance,
    warnings: target <= 0 ? ['以此盈虧比反推的止盈價位為負值或零，請確認盈虧比與止損距離'] : [],
    netRR: rr, // 含費用後的淨盈虧比（止盈價已依此反推）
  };
}
