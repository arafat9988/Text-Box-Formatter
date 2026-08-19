import React, { useState, useEffect, useRef } from 'react';

export interface MathSymbolItem {
  id: string;
  name: string;
  nameBn: string;
  latex: string;
  display: React.ReactNode;
  category: 'common' | 'fraction' | 'calculus' | 'powers' | 'operators' | 'logic' | 'greek';
  description?: string;
  templateType?: 'fraction' | 'root' | 'power' | 'subscript' | 'wrap' | 'simple';
}

export const MATH_SYMBOLS: MathSymbolItem[] = [
  // --- Fractions & Roots ---
  {
    id: 'frac',
    name: 'Fraction',
    nameBn: 'ভগ্নাংশ (Fraction)',
    latex: '\\frac{a}{b}',
    display: (
      <span className="inline-flex flex-col items-center justify-center text-[11px] leading-tight font-serif">
        <span className="border-b border-current px-0.5">a</span>
        <span>b</span>
      </span>
    ),
    category: 'fraction',
    description: 'LaTeX vertical fraction: \\frac{লব}{হর}',
    templateType: 'fraction'
  },
  {
    id: 'dfrac',
    name: 'Display Fraction',
    nameBn: 'বড় ভগ্নাংশ (dfrac)',
    latex: '\\dfrac{a}{b}',
    display: (
      <span className="inline-flex flex-col items-center justify-center text-[12px] leading-tight font-serif font-bold">
        <span className="border-b border-current px-0.5">a</span>
        <span>b</span>
      </span>
    ),
    category: 'fraction',
    description: '\\dfrac{লব}{হর}',
    templateType: 'fraction'
  },
  {
    id: 'sqrt',
    name: 'Square Root',
    nameBn: 'বর্গমূল (Root)',
    latex: '\\sqrt{x}',
    display: <span className="font-serif">√<span className="border-t border-current -ml-0.5 px-0.5">x</span></span>,
    category: 'fraction',
    description: 'Square root: \\sqrt{x}',
    templateType: 'root'
  },
  {
    id: 'sqrt_n',
    name: 'n-th Root',
    nameBn: 'n-তম মূল (n-th Root)',
    latex: '\\sqrt[n]{x}',
    display: <span className="font-serif text-xs"><sup>n</sup>√<span className="border-t border-current -ml-0.5 px-0.5">x</span></span>,
    category: 'fraction',
    description: 'n-th root: \\sqrt[n]{x}',
    templateType: 'wrap'
  },
  {
    id: 'sqrt_3',
    name: 'Cube Root',
    nameBn: 'ঘনমূল (Cube Root)',
    latex: '\\sqrt[3]{x}',
    display: <span className="font-serif text-xs"><sup>3</sup>√<span className="border-t border-current -ml-0.5 px-0.5">x</span></span>,
    category: 'fraction',
    description: 'Cube root: \\sqrt[3]{x}',
    templateType: 'wrap'
  },
  {
    id: 'dydx',
    name: 'Derivative',
    nameBn: 'অন্তরীকরণ (dy/dx)',
    latex: '\\frac{dy}{dx}',
    display: (
      <span className="inline-flex flex-col items-center justify-center text-[10px] leading-none font-serif">
        <span className="border-b border-current">dy</span>
        <span>dx</span>
      </span>
    ),
    category: 'fraction',
    description: 'Derivative: \\frac{dy}{dx}',
    templateType: 'simple'
  },
  {
    id: 'partial',
    name: 'Partial Derivative',
    nameBn: 'আংশিক অন্তরক (∂y/∂x)',
    latex: '\\frac{\\partial y}{\\partial x}',
    display: (
      <span className="inline-flex flex-col items-center justify-center text-[10px] leading-none font-serif">
        <span className="border-b border-current">∂y</span>
        <span>∂x</span>
      </span>
    ),
    category: 'fraction',
    description: 'Partial derivative: \\frac{\\partial y}{\\partial x}',
    templateType: 'simple'
  },

  // --- Calculus & Series ---
  {
    id: 'int',
    name: 'Integral',
    nameBn: 'যোগজীকরণ / ইন্টিগ্রাল (∫)',
    latex: '\\int',
    display: <span className="text-base font-serif">∫</span>,
    category: 'calculus',
    description: 'Indefinite integral: \\int',
    templateType: 'simple'
  },
  {
    id: 'int_limits',
    name: 'Definite Integral',
    nameBn: 'নির্দিষ্ট যোগজ (∫_a^b)',
    latex: '\\int_{a}^{b}',
    display: <span className="text-sm font-serif">∫<sub>a</sub><sup>b</sup></span>,
    category: 'calculus',
    description: 'Definite integral: \\int_{a}^{b} f(x)dx',
    templateType: 'simple'
  },
  {
    id: 'sum',
    name: 'Summation',
    nameBn: 'সামেশন / যোগফল (∑)',
    latex: '\\sum',
    display: <span className="text-base font-serif font-bold">∑</span>,
    category: 'calculus',
    description: 'Summation: \\sum',
    templateType: 'simple'
  },
  {
    id: 'sum_limits',
    name: 'Sum with Limits',
    nameBn: 'সীমা সহ সামেশন (∑_{i=1}^n)',
    latex: '\\sum_{i=1}^{n}',
    display: <span className="text-xs font-serif">∑<sub>i=1</sub><sup>n</sup></span>,
    category: 'calculus',
    description: 'Summation with limits: \\sum_{i=1}^{n}',
    templateType: 'simple'
  },
  {
    id: 'prod',
    name: 'Product',
    nameBn: 'গুণফল / প্রডাক্ট (∏)',
    latex: '\\prod',
    display: <span className="text-base font-serif font-bold">∏</span>,
    category: 'calculus',
    description: 'Product: \\prod',
    templateType: 'simple'
  },
  {
    id: 'prod_limits',
    name: 'Product with Limits',
    nameBn: 'সীমা সহ গুণফল (∏_{i=1}^n)',
    latex: '\\prod_{i=1}^{n}',
    display: <span className="text-xs font-serif">∏<sub>i=1</sub><sup>n</sup></span>,
    category: 'calculus',
    description: 'Product with limits: \\prod_{i=1}^{n}',
    templateType: 'simple'
  },
  {
    id: 'lim_0',
    name: 'Limit to 0',
    nameBn: 'লিমিট শূন্য (lim_{x→0})',
    latex: '\\lim_{x \\to 0}',
    display: <span className="text-xs font-serif">lim<sub>x→0</sub></span>,
    category: 'calculus',
    description: 'Limit to 0: \\lim_{x \\to 0}',
    templateType: 'simple'
  },
  {
    id: 'lim_inf',
    name: 'Limit to Infinity',
    nameBn: 'লিমিট অসীম (lim_{x→∞})',
    latex: '\\lim_{x \\to \\infty}',
    display: <span className="text-xs font-serif">lim<sub>x→∞</sub></span>,
    category: 'calculus',
    description: 'Limit to infinity: \\lim_{x \\to \\infty}',
    templateType: 'simple'
  },
  {
    id: 'nabla',
    name: 'Nabla / Del',
    nameBn: 'নাবলা / ডেল (∇)',
    latex: '\\nabla',
    display: <span className="text-sm font-serif">∇</span>,
    category: 'calculus',
    description: 'Gradient/Nabla: \\nabla',
    templateType: 'simple'
  },

  // --- Powers & Indices ---
  {
    id: 'pow_2',
    name: 'Square',
    nameBn: 'বর্গ / স্কয়ার (x²)',
    latex: '^{2}',
    display: <span className="text-sm font-serif">x<sup>2</sup></span>,
    category: 'powers',
    description: 'Square: ^{2}',
    templateType: 'power'
  },
  {
    id: 'pow_3',
    name: 'Cube',
    nameBn: 'ঘন / কিউব (x³)',
    latex: '^{3}',
    display: <span className="text-sm font-serif">x<sup>3</sup></span>,
    category: 'powers',
    description: 'Cube: ^{3}',
    templateType: 'power'
  },
  {
    id: 'pow_n',
    name: 'Power n',
    nameBn: 'পাওয়ার n (xⁿ)',
    latex: '^{n}',
    display: <span className="text-sm font-serif">x<sup>n</sup></span>,
    category: 'powers',
    description: 'Power: ^{n}',
    templateType: 'power'
  },
  {
    id: 'pow_neg',
    name: 'Negative Power',
    nameBn: 'ঋণাত্মক পাওয়ার (x⁻¹)',
    latex: '^{-1}',
    display: <span className="text-sm font-serif">x<sup>-1</sup></span>,
    category: 'powers',
    description: 'Negative power: ^{-1}',
    templateType: 'power'
  },
  {
    id: 'sub_1',
    name: 'Subscript 1',
    nameBn: 'সাবস্ক্রিপ্ট ১ (x₁)',
    latex: '_{1}',
    display: <span className="text-sm font-serif">x<sub>1</sub></span>,
    category: 'powers',
    description: 'Subscript: _{1}',
    templateType: 'subscript'
  },
  {
    id: 'sub_2',
    name: 'Subscript 2',
    nameBn: 'সাবস্ক্রিপ্ট ২ (x₂)',
    latex: '_{2}',
    display: <span className="text-sm font-serif">x<sub>2</sub></span>,
    category: 'powers',
    description: 'Subscript: _{2}',
    templateType: 'subscript'
  },
  {
    id: 'sub_i',
    name: 'Subscript i',
    nameBn: 'সাবস্ক্রিপ্ট i (xᵢ)',
    latex: '_{i}',
    display: <span className="text-sm font-serif">x<sub>i</sub></span>,
    category: 'powers',
    description: 'Subscript: _{i}',
    templateType: 'subscript'
  },
  {
    id: 'sub_n',
    name: 'Subscript n',
    nameBn: 'সাবস্ক্রিপ্ট n (xₙ)',
    latex: '_{n}',
    display: <span className="text-sm font-serif">x<sub>n</sub></span>,
    category: 'powers',
    description: 'Subscript: _{n}',
    templateType: 'subscript'
  },
  {
    id: 'exp',
    name: 'Exponential',
    nameBn: 'এক্সপোনেনশিয়াল (eˣ)',
    latex: 'e^{x}',
    display: <span className="text-sm font-serif">e<sup>x</sup></span>,
    category: 'powers',
    description: 'Exponential: e^{x}',
    templateType: 'simple'
  },
  {
    id: 'ten_pow',
    name: '10 Power',
    nameBn: '১০ এর সূচক (10⁻³)',
    latex: '10^{-3}',
    display: <span className="text-sm font-serif">10<sup>-3</sup></span>,
    category: 'powers',
    description: 'Power of 10: 10^{-3}',
    templateType: 'simple'
  },

  // --- Basic Operators & Relations ---
  {
    id: 'times',
    name: 'Multiply',
    nameBn: 'গুণন (×)',
    latex: '\\times',
    display: <span className="text-base font-serif">×</span>,
    category: 'operators',
    description: 'Multiplication: \\times',
    templateType: 'simple'
  },
  {
    id: 'div',
    name: 'Divide',
    nameBn: 'ভাগ (÷)',
    latex: '\\div',
    display: <span className="text-base font-serif">÷</span>,
    category: 'operators',
    description: 'Division: \\div',
    templateType: 'simple'
  },
  {
    id: 'pm',
    name: 'Plus-Minus',
    nameBn: 'প্লাস-মাইনাস (±)',
    latex: '\\pm',
    display: <span className="text-base font-serif">±</span>,
    category: 'operators',
    description: 'Plus or minus: \\pm',
    templateType: 'simple'
  },
  {
    id: 'mp',
    name: 'Minus-Plus',
    nameBn: 'মাইনাস-প্লাস (∓)',
    latex: '\\mp',
    display: <span className="text-base font-serif">∓</span>,
    category: 'operators',
    description: 'Minus or plus: \\mp',
    templateType: 'simple'
  },
  {
    id: 'cdot',
    name: 'Dot Product',
    nameBn: 'ডট গুণন (·)',
    latex: '\\cdot',
    display: <span className="text-base font-bold">·</span>,
    category: 'operators',
    description: 'Dot product: \\cdot',
    templateType: 'simple'
  },
  {
    id: 'neq',
    name: 'Not Equal',
    nameBn: 'সমান নয় (≠)',
    latex: '\\neq',
    display: <span className="text-base font-serif">≠</span>,
    category: 'operators',
    description: 'Not equal: \\neq',
    templateType: 'simple'
  },
  {
    id: 'approx',
    name: 'Approximate',
    nameBn: 'আসন্ন / প্রায় সমান (≈)',
    latex: '\\approx',
    display: <span className="text-base font-serif">≈</span>,
    category: 'operators',
    description: 'Approximately equal: \\approx',
    templateType: 'simple'
  },
  {
    id: 'leq',
    name: 'Less or Equal',
    nameBn: 'ছোট বা সমান (≤)',
    latex: '\\leq',
    display: <span className="text-base font-serif">≤</span>,
    category: 'operators',
    description: 'Less than or equal: \\leq',
    templateType: 'simple'
  },
  {
    id: 'geq',
    name: 'Greater or Equal',
    nameBn: 'বড় বা সমান (≥)',
    latex: '\\geq',
    display: <span className="text-base font-serif">≥</span>,
    category: 'operators',
    description: 'Greater than or equal: \\geq',
    templateType: 'simple'
  },
  {
    id: 'equiv',
    name: 'Equivalent',
    nameBn: 'অভিন্ন / সমতুল্য (≡)',
    latex: '\\equiv',
    display: <span className="text-base font-serif">≡</span>,
    category: 'operators',
    description: 'Equivalent: \\equiv',
    templateType: 'simple'
  },
  {
    id: 'propto',
    name: 'Proportional',
    nameBn: 'সমানুপাতিক (∝)',
    latex: '\\propto',
    display: <span className="text-base font-serif">∝</span>,
    category: 'operators',
    description: 'Proportional to: \\propto',
    templateType: 'simple'
  },

  // --- Logic, Sets & Geometry ---
  {
    id: 'implies',
    name: 'Implies',
    nameBn: 'সুতরাং / বা (⇒)',
    latex: '\\implies',
    display: <span className="text-base font-bold">⇒</span>,
    category: 'logic',
    description: 'Implies: \\implies',
    templateType: 'simple'
  },
  {
    id: 'iff',
    name: 'If and only if',
    nameBn: 'যদি ও কেবল যদি (⇔)',
    latex: '\\iff',
    display: <span className="text-base font-bold">⇔</span>,
    category: 'logic',
    description: 'If and only if: \\iff',
    templateType: 'simple'
  },
  {
    id: 'therefore',
    name: 'Therefore',
    nameBn: 'অতএব (∴)',
    latex: '\\therefore',
    display: <span className="text-base font-bold">∴</span>,
    category: 'logic',
    description: 'Therefore: \\therefore',
    templateType: 'simple'
  },
  {
    id: 'because',
    name: 'Because',
    nameBn: 'যেহেতু (∵)',
    latex: '\\because',
    display: <span className="text-base font-bold">∵</span>,
    category: 'logic',
    description: 'Because: \\because',
    templateType: 'simple'
  },
  {
    id: 'to_arrow',
    name: 'Right Arrow',
    nameBn: 'ডান তীরচিহ্ন (→)',
    latex: '\\to',
    display: <span className="text-base font-bold">→</span>,
    category: 'logic',
    description: 'Right arrow / tends to: \\to',
    templateType: 'simple'
  },
  {
    id: 'degree',
    name: 'Degree',
    nameBn: 'ডিগ্রি (°)',
    latex: '\\degree',
    display: <span className="text-base font-serif">°</span>,
    category: 'logic',
    description: 'Degree: \\degree',
    templateType: 'simple'
  },
  {
    id: 'angle',
    name: 'Angle',
    nameBn: 'কোণ (∠)',
    latex: '\\angle',
    display: <span className="text-base font-serif">∠</span>,
    category: 'logic',
    description: 'Angle: \\angle',
    templateType: 'simple'
  },
  {
    id: 'parallel',
    name: 'Parallel',
    nameBn: 'সমান্তরাল (∥)',
    latex: '\\parallel',
    display: <span className="text-base font-serif">∥</span>,
    category: 'logic',
    description: 'Parallel: \\parallel',
    templateType: 'simple'
  },
  {
    id: 'perp',
    name: 'Perpendicular',
    nameBn: 'লম্ব (⊥)',
    latex: '\\perp',
    display: <span className="text-base font-serif">⊥</span>,
    category: 'logic',
    description: 'Perpendicular: \\perp',
    templateType: 'simple'
  },
  {
    id: 'infinity',
    name: 'Infinity',
    nameBn: 'অসীম (∞)',
    latex: '\\infty',
    display: <span className="text-base font-serif">∞</span>,
    category: 'logic',
    description: 'Infinity: \\infty',
    templateType: 'simple'
  },
  {
    id: 'in',
    name: 'Element of',
    nameBn: 'সদস্য / অন্তর্ভুক্ত (∈)',
    latex: '\\in',
    display: <span className="text-base font-serif">∈</span>,
    category: 'logic',
    description: 'Element of: \\in',
    templateType: 'simple'
  },
  {
    id: 'notin',
    name: 'Not element of',
    nameBn: 'সদস্য নয় (∉)',
    latex: '\\notin',
    display: <span className="text-base font-serif">∉</span>,
    category: 'logic',
    description: 'Not an element of: \\notin',
    templateType: 'simple'
  },
  {
    id: 'subset',
    name: 'Subset',
    nameBn: 'উপসেট (⊂)',
    latex: '\\subset',
    display: <span className="text-base font-serif">⊂</span>,
    category: 'logic',
    description: 'Subset: \\subset',
    templateType: 'simple'
  },
  {
    id: 'cup',
    name: 'Union',
    nameBn: 'সংযোগ সেট / কাপ (∪)',
    latex: '\\cup',
    display: <span className="text-base font-serif">∪</span>,
    category: 'logic',
    description: 'Set union: \\cup',
    templateType: 'simple'
  },
  {
    id: 'cap',
    name: 'Intersection',
    nameBn: 'ছেদ সেট / ক্যাপ (∩)',
    latex: '\\cap',
    display: <span className="text-base font-serif">∩</span>,
    category: 'logic',
    description: 'Set intersection: \\cap',
    templateType: 'simple'
  },
  {
    id: 'emptyset',
    name: 'Empty Set',
    nameBn: 'ফাঁকা সেট (∅)',
    latex: '\\emptyset',
    display: <span className="text-base font-serif">∅</span>,
    category: 'logic',
    description: 'Empty set: \\emptyset',
    templateType: 'simple'
  },

  // --- Greek Letters ---
  {
    id: 'pi',
    name: 'Pi',
    nameBn: 'পাই (π)',
    latex: '\\pi',
    display: <span className="text-base font-serif">π</span>,
    category: 'greek',
    description: 'Pi: \\pi',
    templateType: 'simple'
  },
  {
    id: 'theta',
    name: 'Theta',
    nameBn: 'থিটা (θ)',
    latex: '\\theta',
    display: <span className="text-base font-serif">θ</span>,
    category: 'greek',
    description: 'Theta: \\theta',
    templateType: 'simple'
  },
  {
    id: 'alpha',
    name: 'Alpha',
    nameBn: 'আলফা (α)',
    latex: '\\alpha',
    display: <span className="text-base font-serif">α</span>,
    category: 'greek',
    description: 'Alpha: \\alpha',
    templateType: 'simple'
  },
  {
    id: 'beta',
    name: 'Beta',
    nameBn: 'বিটা (β)',
    latex: '\\beta',
    display: <span className="text-base font-serif">β</span>,
    category: 'greek',
    description: 'Beta: \\beta',
    templateType: 'simple'
  },
  {
    id: 'gamma',
    name: 'Gamma',
    nameBn: 'গামা (γ)',
    latex: '\\gamma',
    display: <span className="text-base font-serif">γ</span>,
    category: 'greek',
    description: 'Gamma: \\gamma',
    templateType: 'simple'
  },
  {
    id: 'delta',
    name: 'Delta',
    nameBn: 'ডেল্টা (δ)',
    latex: '\\delta',
    display: <span className="text-base font-serif">δ</span>,
    category: 'greek',
    description: 'Delta: \\delta',
    templateType: 'simple'
  },
  {
    id: 'Delta_cap',
    name: 'Capital Delta',
    nameBn: 'বড় ডেল্টা (Δ)',
    latex: '\\Delta',
    display: <span className="text-base font-serif font-bold">Δ</span>,
    category: 'greek',
    description: 'Delta difference: \\Delta',
    templateType: 'simple'
  },
  {
    id: 'lambda',
    name: 'Lambda',
    nameBn: 'ল্যাম্বডা (λ)',
    latex: '\\lambda',
    display: <span className="text-base font-serif">λ</span>,
    category: 'greek',
    description: 'Wavelength/Lambda: \\lambda',
    templateType: 'simple'
  },
  {
    id: 'mu',
    name: 'Mu',
    nameBn: 'মিউ (μ)',
    latex: '\\mu',
    display: <span className="text-base font-serif">μ</span>,
    category: 'greek',
    description: 'Micro/Mu: \\mu',
    templateType: 'simple'
  },
  {
    id: 'sigma',
    name: 'Sigma',
    nameBn: 'সিগমা (σ)',
    latex: '\\sigma',
    display: <span className="text-base font-serif">σ</span>,
    category: 'greek',
    description: 'Sigma: \\sigma',
    templateType: 'simple'
  },
  {
    id: 'omega',
    name: 'Omega',
    nameBn: 'ওমেগা (ω)',
    latex: '\\omega',
    display: <span className="text-base font-serif">ω</span>,
    category: 'greek',
    description: 'Angular speed/Omega: \\omega',
    templateType: 'simple'
  },
  {
    id: 'Omega_cap',
    name: 'Ohm / Capital Omega',
    nameBn: 'ওহম / ক্যাপিটাল ওমেগা (Ω)',
    latex: '\\Omega',
    display: <span className="text-base font-serif font-bold">Ω</span>,
    category: 'greek',
    description: 'Ohm/Omega: \\Omega',
    templateType: 'simple'
  },
  {
    id: 'phi',
    name: 'Phi',
    nameBn: 'ফাই (φ)',
    latex: '\\phi',
    display: <span className="text-base font-serif">φ</span>,
    category: 'greek',
    description: 'Phi: \\phi',
    templateType: 'simple'
  },
  {
    id: 'rho',
    name: 'Rho',
    nameBn: 'রো / ঘনত্ব (ρ)',
    latex: '\\rho',
    display: <span className="text-base font-serif">ρ</span>,
    category: 'greek',
    description: 'Density/Resistivity/Rho: \\rho',
    templateType: 'simple'
  },
  {
    id: 'eta',
    name: 'Eta',
    nameBn: 'ইটা / দক্ষতা (η)',
    latex: '\\eta',
    display: <span className="text-base font-serif">η</span>,
    category: 'greek',
    description: 'Efficiency/Eta: \\eta',
    templateType: 'simple'
  }
];

/**
 * Inserts a LaTeX symbol or formula snippet at the cursor / selection of a textarea
 */
export function insertMathSnippetToTextarea(
  textarea: HTMLTextAreaElement | null,
  item: MathSymbolItem,
  customParam?: { num?: string; den?: string }
): boolean {
  if (!textarea) return false;

  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const originalText = textarea.value;
  const selectedText = originalText.substring(start, end).trim();

  let textToInsert = item.latex;
  let cursorOffset = textToInsert.length;
  let selectRange: [number, number] | null = null;

  if (item.templateType === 'fraction') {
    if (selectedText) {
      // If user selected e.g. "60 * 800", make it \frac{60 * 800}{b}
      textToInsert = `\\frac{${selectedText}}{b}`;
      const bIndex = textToInsert.lastIndexOf('b');
      selectRange = [start + bIndex, start + bIndex + 1];
    } else if (customParam?.num || customParam?.den) {
      const n = customParam.num || 'a';
      const d = customParam.den || 'b';
      textToInsert = `\\frac{${n}}{${d}}`;
      cursorOffset = textToInsert.length;
    } else {
      textToInsert = `\\frac{a}{b}`;
      selectRange = [start + 6, start + 7]; // select 'a'
    }
  } else if (item.templateType === 'root') {
    if (selectedText) {
      textToInsert = `\\sqrt{${selectedText}}`;
      cursorOffset = textToInsert.length;
    } else {
      textToInsert = `\\sqrt{x}`;
      selectRange = [start + 6, start + 7]; // select 'x'
    }
  } else if (item.templateType === 'power') {
    if (selectedText) {
      // e.g. x selected -> x^{2}
      textToInsert = `${selectedText}${item.latex}`;
      cursorOffset = textToInsert.length;
    } else {
      textToInsert = item.latex;
      cursorOffset = textToInsert.length;
    }
  } else if (item.templateType === 'subscript') {
    if (selectedText) {
      textToInsert = `${selectedText}${item.latex}`;
      cursorOffset = textToInsert.length;
    } else {
      textToInsert = item.latex;
      cursorOffset = textToInsert.length;
    }
  } else if (item.templateType === 'wrap') {
    if (selectedText) {
      textToInsert = item.latex.replace(/\{x\}/, `{${selectedText}}`);
      cursorOffset = textToInsert.length;
    } else {
      textToInsert = item.latex;
    }
  }

  // Update textarea value using standard execCommand if possible or direct assignment + dispatchEvent
  textarea.focus();
  const before = originalText.substring(0, start);
  const after = originalText.substring(end);
  const nextValue = before + textToInsert + after;

  // Use setter to ensure React detects the change
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value'
  )?.set;

  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(textarea, nextValue);
  } else {
    textarea.value = nextValue;
  }

  // Dispatch both 'input' and 'change' events so React state updates
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));

  // Set cursor position or selection
  setTimeout(() => {
    if (selectRange) {
      textarea.setSelectionRange(selectRange[0], selectRange[1]);
    } else {
      const newPos = start + cursorOffset;
      textarea.setSelectionRange(newPos, newPos);
    }
  }, 10);

  return true;
}

interface MathToolbarProps {
  /** Target textarea ref or current focused textarea */
  activeTextareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  /** Fallback callback if active textarea is managed via state */
  onInsertSnippet?: (snippet: string) => void;
  /** Custom class */
  className?: string;
  /** Initial open state */
  defaultOpen?: boolean;
  /** Controlled open state */
  isOpen?: boolean;
  /** Controlled open state callback */
  onOpenChange?: (open: boolean) => void;
}

export const MathToolbar: React.FC<MathToolbarProps> = ({
  activeTextareaRef,
  onInsertSnippet,
  className = '',
  defaultOpen = false,
  isOpen: controlledIsOpen,
  onOpenChange
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const setIsOpen = (nextOpen: boolean) => {
    setInternalIsOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const [activeTab, setActiveTab] = useState<'all' | 'fraction' | 'calculus' | 'powers' | 'operators' | 'logic' | 'greek'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastInserted, setLastInserted] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFractionModalOpen, setIsFractionModalOpen] = useState(false);
  const [fracNum, setFracNum] = useState('60 \\times 800');
  const [fracDen, setFracDen] = useState('100');

  // Track the most recently active / focused textarea across the entire document
  const lastFocusedTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      if (e.target instanceof HTMLTextAreaElement) {
        lastFocusedTextareaRef.current = e.target;
      }
    };
    document.addEventListener('focusin', handleFocusIn);
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, []);

  const handleSymbolClick = (item: MathSymbolItem) => {
    let targetTextarea = activeTextareaRef?.current || lastFocusedTextareaRef.current;
    
    // If no tracked textarea, find the first visible textarea on page
    if (!targetTextarea) {
      const visibleTextareas = Array.from(document.querySelectorAll('textarea')).filter(
        (t) => t.offsetParent !== null && !t.disabled && !t.readOnly
      );
      if (visibleTextareas.length > 0) {
        targetTextarea = visibleTextareas[0] as HTMLTextAreaElement;
      }
    }

    const inserted = insertMathSnippetToTextarea(targetTextarea, item);
    if (!inserted && onInsertSnippet) {
      onInsertSnippet(item.latex);
    }

    setLastInserted(item.latex);
    setTimeout(() => {
      setLastInserted((prev) => (prev === item.latex ? null : prev));
    }, 2000);
  };

  const handleInsertCustomFraction = (e: React.FormEvent) => {
    e.preventDefault();
    const fracItem: MathSymbolItem = {
      id: 'custom_frac',
      name: 'Custom Fraction',
      nameBn: 'কাস্টম ভগ্নাংশ',
      latex: `\\frac{${fracNum || 'a'}}{${fracDen || 'b'}}`,
      display: null,
      category: 'fraction',
      templateType: 'simple'
    };
    handleSymbolClick(fracItem);
    setIsFractionModalOpen(false);
  };

  // Filter symbols based on search query and category
  const filteredSymbols = MATH_SYMBOLS.filter((item) => {
    const matchesCategory = activeTab === 'all' || item.category === activeTab;
    if (!matchesCategory) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.nameBn.toLowerCase().includes(q) ||
      item.latex.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  });

  const categories = [
    { key: 'all', label: 'সবগুলো (All)' },
    { key: 'fraction', label: 'ভগ্নাংশ ও মূল (Frac & Root)' },
    { key: 'calculus', label: 'ক্যালকুলাস (Calculus & Sum)' },
    { key: 'powers', label: 'ঘাত ও সূচক (Power & Sub)' },
    { key: 'operators', label: 'অপারেটর (Operators)' },
    { key: 'logic', label: 'যুক্তি ও সেট (Logic & Sets)' },
    { key: 'greek', label: 'গ্রিক বর্ণ (Greek)' }
  ];

  return (
    <>
      {/* Floating Toggle Pill Button (Always visible on bottom-right) */}
      <div className={`fixed bottom-5 right-5 z-50 flex flex-col items-end pointer-events-auto select-none ${className}`}>
        {lastInserted && (
          <div className="mb-2 bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-full shadow-lg font-mono flex items-center gap-1.5 animate-bounce">
            <span>✓ ইনসার্ট হয়েছে:</span>
            <span className="font-bold bg-emerald-800 px-2 py-0.5 rounded">{lastInserted}</span>
          </div>
        )}

        {!isOpen ? (
          <button
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
            }}
            className="group flex items-center gap-2 bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 hover:from-blue-800 hover:to-indigo-800 text-white px-4 py-2.5 rounded-full shadow-2xl border border-white/20 transition transform active:scale-95 cursor-pointer"
            title="গণিত প্রতীক টুলবার খুলুন (Math Toolbar)"
          >
            <span className="flex items-center justify-center w-6 h-6 bg-white/20 rounded-full font-serif font-bold text-sm">
              ∑
            </span>
            <span className="font-bold text-xs tracking-wide">গণিত প্রতীক (LaTeX Toolbar)</span>
            <span className="bg-sky-400/30 text-sky-100 text-[10px] px-1.5 py-0.5 rounded font-mono">fx</span>
          </button>
        ) : (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 w-[380px] sm:w-[480px] max-w-[95vw] overflow-hidden flex flex-col transition duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 bg-sky-500 text-white rounded font-serif font-bold text-xs">
                  fx
                </span>
                <span className="font-bold text-xs text-slate-100">গণিত ও LaTeX প্রতীক টুলবার</span>
                <span className="text-[10px] text-sky-300 font-mono bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800/60">
                  LaTeX Format
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsFractionModalOpen(true)}
                  className="bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold px-2 py-0.5 rounded transition"
                  title="ভগ্নাংশ তৈরি করুন (Fraction Builder)"
                >
                  <i className="fa-solid fa-divide mr-1"></i>ভগ্নাংশ
                </button>
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="text-slate-400 hover:text-white p-1 transition"
                  title={isMinimized ? 'প্রসারিত করুন' : 'ছোট করুন'}
                >
                  <i className={`fa-solid ${isMinimized ? 'fa-window-maximize' : 'fa-minus'} text-xs`}></i>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-red-400 p-1 transition"
                  title="বন্ধ করুন"
                >
                  <i className="fa-solid fa-xmark text-xs"></i>
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Search Bar & Quick Info */}
                <div className="p-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center gap-2">
                  <div className="relative flex-1">
                    <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="প্রতীক বা LaTeX খুঁজুন (উদা: frac, sqrt, int, sum, alpha, পাই)..."
                      className="w-full bg-white border border-slate-300 rounded-lg pl-7 pr-7 py-1 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-sans"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    )}
                  </div>
                </div>

                {/* Categories Tabs */}
                <div className="flex gap-1 overflow-x-auto p-1.5 bg-slate-100/70 border-b border-slate-200/60 scrollbar-thin text-[11px]">
                  {categories.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setActiveTab(cat.key as any)}
                      className={`whitespace-nowrap px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                        activeTab === cat.key
                          ? 'bg-indigo-600 text-white shadow-sm font-bold'
                          : 'text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Symbol Grid */}
                <div className="p-3 max-h-64 overflow-y-auto grid grid-cols-5 sm:grid-cols-6 gap-1.5 bg-white">
                  {filteredSymbols.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSymbolClick(item)}
                      title={`${item.nameBn}\nLaTeX: ${item.latex}\nক্লিক করলে কার্সরে ইনসার্ট হবে`}
                      className="group relative flex flex-col items-center justify-center p-1.5 h-14 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-400 border border-slate-200 rounded-xl transition duration-150 active:scale-95 cursor-pointer"
                    >
                      <div className="flex-1 flex items-center justify-center text-slate-900 group-hover:text-indigo-700 text-sm font-semibold">
                        {item.display}
                      </div>
                      <div className="w-full text-center text-[9px] text-slate-500 group-hover:text-indigo-600 truncate font-mono mt-0.5">
                        {item.latex}
                      </div>
                    </button>
                  ))}

                  {filteredSymbols.length === 0 && (
                    <div className="col-span-full py-8 text-center text-xs text-slate-400">
                      কোনো প্রতীক পাওয়া যায়নি। অন্য কিছু দিয়ে সার্চ করুন।
                    </div>
                  )}
                </div>

                {/* Footer Quick Hint */}
                <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
                  <span className="flex items-center gap-1">
                    <i className="fa-solid fa-lightbulb text-amber-500"></i>
                    <span>টেক্সট সিলেক্ট করে ক্লিক করলে স্বয়ংক্রিয়ভাবে ঘিরে যাবে (Wrap)।</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {filteredSymbols.length} symbols
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Custom Fraction Builder Modal */}
      {isFractionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-serif font-bold">
                  ½
                </span>
                ভগ্নাংশ তৈরি ও ইনসার্ট (Fraction Builder)
              </h3>
              <button
                onClick={() => setIsFractionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <form onSubmit={handleInsertCustomFraction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  লব (Numerator / উপরের অংশ):
                </label>
                <input
                  type="text"
                  value={fracNum}
                  onChange={(e) => setFracNum(e.target.value)}
                  placeholder="যেমন: 60 \times 800 বা x + 5"
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  হর (Denominator / নিচের অংশ):
                </label>
                <input
                  type="text"
                  value={fracDen}
                  onChange={(e) => setFracDen(e.target.value)}
                  placeholder="যেমন: 100 বা y"
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Preview */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                <div className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">
                  প্রিভিউ (LaTeX: \frac{`{${fracNum || 'a'}}{${fracDen || 'b'}}`})
                </div>
                <div className="inline-flex flex-col items-center justify-center text-sm font-serif my-1">
                  <span className="border-b border-slate-800 px-2 py-0.5">{fracNum || 'a'}</span>
                  <span className="px-2 py-0.5">{fracDen || 'b'}</span>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setIsFractionModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-plus text-[10px]"></i>
                  ইনসার্ট করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Compact Inline Quick Math Chips Bar that sits above any textarea
 */
export const QuickMathBar: React.FC<{
  targetTextareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  onOpenFullToolbar?: () => void;
  className?: string;
}> = ({ targetTextareaRef, onOpenFullToolbar, className = '' }) => {
  const quickItems = [
    { id: 'frac', label: '\\frac{a}{b}', name: 'ভগ্নাংশ', display: '½' },
    { id: 'sqrt', label: '\\sqrt{x}', name: 'রুট', display: '√x' },
    { id: 'pow_2', label: '^{2}', name: 'স্কয়ার', display: 'x²' },
    { id: 'int', label: '\\int', name: 'ইন্টিগ্রাল', display: '∫' },
    { id: 'sum', label: '\\sum', name: 'সামেশন', display: '∑' },
    { id: 'times', label: '\\times', name: 'গুণ', display: '×' },
    { id: 'div', label: '\\div', name: 'ভাগ', display: '÷' },
    { id: 'pm', label: '\\pm', name: 'প্লাস-মাইনাস', display: '±' },
    { id: 'degree', label: '\\degree', name: 'ডিগ্রি', display: '°' },
    { id: 'pi', label: '\\pi', name: 'পাই', display: 'π' },
    { id: 'theta', label: '\\theta', name: 'থিটা', display: 'θ' },
    { id: 'implies', label: '\\implies', name: 'সুতরাং', display: '⇒' },
    { id: 'therefore', label: '\\therefore', name: 'অতএব', display: '∴' }
  ];

  const handleQuickInsert = (label: string) => {
    const match = MATH_SYMBOLS.find((s) => s.latex === label || s.id === label);
    if (match) {
      insertMathSnippetToTextarea(targetTextareaRef?.current || null, match);
    } else {
      const generic: MathSymbolItem = {
        id: label,
        name: label,
        nameBn: label,
        latex: label,
        display: null,
        category: 'common',
        templateType: 'simple'
      };
      insertMathSnippetToTextarea(targetTextareaRef?.current || null, generic);
    }
  };

  return (
    <div className={`flex items-center gap-1.5 overflow-x-auto py-1 px-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs scrollbar-thin ${className}`}>
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap mr-1 flex items-center gap-1">
        <span className="text-indigo-600 font-serif font-bold">fx</span> গণিত:
      </span>
      {quickItems.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => handleQuickInsert(item.label)}
          title={`${item.name} (${item.label}) কার্সরে ইনসার্ট করুন`}
          className="bg-white hover:bg-indigo-50 text-slate-800 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 px-2 py-0.5 rounded font-serif font-medium text-xs shadow-xs transition active:scale-95 whitespace-nowrap cursor-pointer"
        >
          {item.display}
        </button>
      ))}
      {onOpenFullToolbar && (
        <button
          type="button"
          onClick={onOpenFullToolbar}
          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-bold text-[11px] shadow-xs transition whitespace-nowrap cursor-pointer flex items-center gap-1"
        >
          <i className="fa-solid fa-plus text-[9px]"></i> আরও প্রতীক
        </button>
      )}
    </div>
  );
};
