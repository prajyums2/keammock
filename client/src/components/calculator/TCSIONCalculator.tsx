import { useState, useRef, useEffect } from 'react';
import { X, Trash2, Delete } from 'lucide-react';

interface TCSIONCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  onCalculate?: (value: string) => void;
}

export default function TCSIONCalculator({ isOpen, onClose, onCalculate }: TCSIONCalculatorProps) {
  const [display, setDisplay] = useState('0');
  const [memory, setMemory] = useState(0);
  const [isRadians, setIsRadians] = useState(true);
  const [history, setHistory] = useState<string[]>([]);
  const calculatorRef = useRef<HTMLDivElement>(null);

  // TCS iON Calculator Layout - Mouse only, no keyboard
  const handleButtonClick = (value: string) => {
    if (display === 'Error') {
      setDisplay('0');
    }

    switch (value) {
      case 'C':
        setDisplay('0');
        break;
      case 'CE':
        setDisplay('0');
        break;
      case '⌫':
        setDisplay(display.length > 1 ? display.slice(0, -1) : '0');
        break;
      case '=':
        try {
          // Safe evaluation - only allow mathematical operations
          let expr = display
            .replace(/×/g, '*')
            .replace(/÷/g, '/')
            .replace(/π/g, 'Math.PI')
            .replace(/e/g, 'Math.E')
            .replace(/sin\(/g, isRadians ? 'Math.sin(' : 'Math.sin(Math.PI/180*')
            .replace(/cos\(/g, isRadians ? 'Math.cos(' : 'Math.cos(Math.PI/180*')
            .replace(/tan\(/g, isRadians ? 'Math.tan(' : 'Math.tan(Math.PI/180*')
            .replace(/log\(/g, 'Math.log10(')
            .replace(/ln\(/g, 'Math.log(')
            .replace(/√\(/g, 'Math.sqrt(')
            .replace(/\^/g, '**');
          
          // eslint-disable-next-line no-eval
          const result = eval(expr);
          const formattedResult = parseFloat(result.toFixed(10)).toString();
          setHistory(prev => [...prev.slice(-4), `${display} = ${formattedResult}`]);
          setDisplay(formattedResult);
          onCalculate?.(formattedResult);
        } catch {
          setDisplay('Error');
        }
        break;
      case 'sin':
      case 'cos':
      case 'tan':
      case 'log':
      case 'ln':
      case '√':
        setDisplay(display === '0' ? `${value}(` : `${display}${value}(`);
        break;
      case 'π':
      case 'e':
        setDisplay(display === '0' ? value : `${display}${value}`);
        break;
      case 'x²':
        setDisplay(display === '0' ? '0' : `(${display})**2`);
        break;
      case 'x³':
        setDisplay(display === '0' ? '0' : `(${display})**3`);
        break;
      case 'xʸ':
        setDisplay(display === '0' ? '0' : `${display}^`);
        break;
      case '1/x':
        setDisplay(display === '0' ? 'Error' : `1/(${display})`);
        break;
      case '|x|':
        setDisplay(display === '0' ? '0' : `Math.abs(${display})`);
        break;
      case 'n!':
        try {
          const n = parseInt(display);
          if (n < 0 || n > 170) {
            setDisplay('Error');
          } else {
            let fact = 1;
            for (let i = 2; i <= n; i++) fact *= i;
            setDisplay(fact.toString());
          }
        } catch {
          setDisplay('Error');
        }
        break;
      case '10ˣ':
        setDisplay(display === '0' ? '10' : `10**(${display})`);
        break;
      case 'eˣ':
        setDisplay(display === '0' ? 'e' : `e**(${display})`);
        break;
      case 'MC':
        setMemory(0);
        break;
      case 'MR':
        setDisplay(memory.toString());
        break;
      case 'M+':
        try {
          const val = parseFloat(display);
          setMemory(memory + val);
        } catch {}
        break;
      case 'M-':
        try {
          const val = parseFloat(display);
          setMemory(memory - val);
        } catch {}
        break;
      case 'MS':
        try {
          setMemory(parseFloat(display));
        } catch {}
        break;
      default:
        if (['+', '-', '×', '÷', '.', '(', ')'].includes(value)) {
          setDisplay(display === '0' && value !== '.' ? value : `${display}${value}`);
        } else {
          setDisplay(display === '0' ? value : `${display}${value}`);
        }
    }
  };

  // Prevent keyboard input
  useEffect(() => {
    const preventKeyboard = (e: KeyboardEvent) => {
      if (isOpen) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', preventKeyboard, true);
      document.addEventListener('keypress', preventKeyboard, true);
      document.addEventListener('keyup', preventKeyboard, true);
    }

    return () => {
      document.removeEventListener('keydown', preventKeyboard, true);
      document.removeEventListener('keypress', preventKeyboard, true);
      document.removeEventListener('keyup', preventKeyboard, true);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const buttonClass = "h-10 px-2 text-sm font-medium rounded transition-all active:scale-95 select-none";
  const numberClass = `${buttonClass} bg-gray-100 hover:bg-gray-200 text-gray-900`;
  const operatorClass = `${buttonClass} bg-blue-50 hover:bg-blue-100 text-blue-700`;
  const functionClass = `${buttonClass} bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs`;
  const equalsClass = `${buttonClass} bg-blue-600 hover:bg-blue-700 text-white`;
  const clearClass = `${buttonClass} bg-red-50 hover:bg-red-100 text-red-600`;
  const memoryClass = `${buttonClass} bg-yellow-50 hover:bg-yellow-100 text-yellow-700 text-xs`;

  return (
    <div 
      ref={calculatorRef}
      className="fixed bottom-4 right-4 bg-white rounded-lg shadow-2xl border border-gray-300 p-4 w-[420px] z-50 select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
        <h3 className="font-bold text-gray-800">Virtual Calculator</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsRadians(!isRadians)}
            className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
          >
            {isRadians ? 'RAD' : 'DEG'}
          </button>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Display */}
      <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-3 mb-3">
        <div className="text-right font-mono text-2xl text-gray-900 min-h-[40px] overflow-hidden text-ellipsis">
          {display}
        </div>
        {memory !== 0 && (
          <div className="text-right text-xs text-yellow-600 mt-1">
            M = {memory}
          </div>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-600 max-h-20 overflow-y-auto">
          {history.map((h, i) => (
            <div key={i} className="truncate">{h}</div>
          ))}
        </div>
      )}

      {/* Calculator Grid - TCS iON Layout */}
      <div className="grid grid-cols-5 gap-1.5">
        {/* Row 1: Memory & Constants */}
        <button onClick={() => handleButtonClick('MC')} className={memoryClass}>MC</button>
        <button onClick={() => handleButtonClick('MR')} className={memoryClass}>MR</button>
        <button onClick={() => handleButtonClick('M+')} className={memoryClass}>M+</button>
        <button onClick={() => handleButtonClick('M-')} className={memoryClass}>M-</button>
        <button onClick={() => handleButtonClick('MS')} className={memoryClass}>MS</button>

        {/* Row 2: Trigonometric */}
        <button onClick={() => handleButtonClick('sin')} className={functionClass}>sin</button>
        <button onClick={() => handleButtonClick('cos')} className={functionClass}>cos</button>
        <button onClick={() => handleButtonClick('tan')} className={functionClass}>tan</button>
        <button onClick={() => handleButtonClick('(')} className={functionClass}>(</button>
        <button onClick={() => handleButtonClick(')')} className={functionClass}>)</button>

        {/* Row 3: Advanced Functions */}
        <button onClick={() => handleButtonClick('sinh')} className={functionClass}>sinh</button>
        <button onClick={() => handleButtonClick('cosh')} className={functionClass}>cosh</button>
        <button onClick={() => handleButtonClick('tanh')} className={functionClass}>tanh</button>
        <button onClick={() => handleButtonClick('π')} className={functionClass}>π</button>
        <button onClick={() => handleButtonClick('e')} className={functionClass}>e</button>

        {/* Row 4: Logarithmic */}
        <button onClick={() => handleButtonClick('log')} className={functionClass}>log</button>
        <button onClick={() => handleButtonClick('ln')} className={functionClass}>ln</button>
        <button onClick={() => handleButtonClick('x²')} className={functionClass}>x²</button>
        <button onClick={() => handleButtonClick('x³')} className={functionClass}>x³</button>
        <button onClick={() => handleButtonClick('xʸ')} className={functionClass}>xʸ</button>

        {/* Row 5: More Functions */}
        <button onClick={() => handleButtonClick('√')} className={functionClass}>√</button>
        <button onClick={() => handleButtonClick('10ˣ')} className={functionClass}>10ˣ</button>
        <button onClick={() => handleButtonClick('eˣ')} className={functionClass}>eˣ</button>
        <button onClick={() => handleButtonClick('1/x')} className={functionClass}>1/x</button>
        <button onClick={() => handleButtonClick('|x|')} className={functionClass}>|x|</button>

        {/* Row 6: Clear & Operations */}
        <button onClick={() => handleButtonClick('C')} className={clearClass}>C</button>
        <button onClick={() => handleButtonClick('CE')} className={clearClass}>CE</button>
        <button onClick={() => handleButtonClick('⌫')} className={clearClass}>⌫</button>
        <button onClick={() => handleButtonClick('n!')} className={functionClass}>n!</button>
        <button onClick={() => handleButtonClick('÷')} className={operatorClass}>÷</button>

        {/* Row 7: Numbers & Operations */}
        <button onClick={() => handleButtonClick('7')} className={numberClass}>7</button>
        <button onClick={() => handleButtonClick('8')} className={numberClass}>8</button>
        <button onClick={() => handleButtonClick('9')} className={numberClass}>9</button>
        <button onClick={() => handleButtonClick('%')} className={operatorClass}>%</button>
        <button onClick={() => handleButtonClick('×')} className={operatorClass}>×</button>

        {/* Row 8: Numbers & Operations */}
        <button onClick={() => handleButtonClick('4')} className={numberClass}>4</button>
        <button onClick={() => handleButtonClick('5')} className={numberClass}>5</button>
        <button onClick={() => handleButtonClick('6')} className={numberClass}>6</button>
        <button onClick={() => handleButtonClick('±')} className={operatorClass}>±</button>
        <button onClick={() => handleButtonClick('-')} className={operatorClass}>-</button>

        {/* Row 9: Numbers & Operations */}
        <button onClick={() => handleButtonClick('1')} className={numberClass}>1</button>
        <button onClick={() => handleButtonClick('2')} className={numberClass}>2</button>
        <button onClick={() => handleButtonClick('3')} className={numberClass}>3</button>
        <button onClick={() => handleButtonClick('(')} className={operatorClass}>(</button>
        <button onClick={() => handleButtonClick('+')} className={operatorClass}>+</button>

        {/* Row 10: Zero & Decimal */}
        <button onClick={() => handleButtonClick('0')} className={`${numberClass} col-span-2`}>0</button>
        <button onClick={() => handleButtonClick('.')} className={numberClass}>.</button>
        <button onClick={() => handleButtonClick(')')} className={operatorClass}>)</button>
        <button onClick={() => handleButtonClick('=')} className={equalsClass}>=</button>
      </div>

      <div className="mt-3 text-xs text-gray-500 text-center">
        Mouse only • Keyboard input disabled
      </div>
    </div>
  );
}