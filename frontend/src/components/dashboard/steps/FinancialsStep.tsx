import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface FinancialsStepProps {
  formData?: any;
  onNext: (data: any) => void;
  onBack: () => void;
}

// Get today's date in DD.MM.YYYY format
const getTodayDate = () => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}.${month}.${year}`;
};

export const FinancialsStep = ({ formData: parentFormData, onNext, onBack }: FinancialsStepProps) => {
  const [financialType, setFinancialType] = useState<"detailed" | "simple">("detailed");

  // Default row labels (expense categories)
  const defaultRowLabels = [
    "Gross Revenue",
    "Net Revenue",
    "Cost of Goods",
    "Advertising costs",
    "Freelancer/Employees",
    "Transaction Costs",
    "Other Expenses"
  ];

  // Default column labels (time periods)
  const [columnLabels] = useState<Array<{ key: string; label: string }>>([
    { key: "2023", label: "2023" },
    { key: "2024", label: "2024" },
    { key: "today", label: getTodayDate() },
    { key: "Forecast 2025", label: "Forecast 2025" }
  ]);

  const [rowLabels, setRowLabels] = useState<string[]>(defaultRowLabels);
  const [financialData, setFinancialData] = useState<Record<string, Record<string, string>>>(() => {
    const initialData: Record<string, Record<string, string>> = {};
    defaultRowLabels.forEach(row => {
      initialData[row] = {};
      columnLabels.forEach(col => {
        initialData[row][col.key] = "";
      });
    });
    return initialData;
  });

  // Load existing data if available
  useEffect(() => {
    if (parentFormData?.financialData && parentFormData?.rowLabels) {
      setFinancialData(parentFormData.financialData);
      setRowLabels(parentFormData.rowLabels);
    }
  }, [parentFormData]);

  // Handle cell value change
  const handleCellChange = (row: string, col: string, value: string) => {
    setFinancialData(prev => ({
      ...prev,
      [row]: {
        ...prev[row] || {},
        [col]: value
      }
    }));
  };

  // Calculate Net Profit for a column
  const calculateNetProfit = (col: string) => {
    let total = 0;
    rowLabels.forEach(row => {
      const value = parseFloat(financialData[row]?.[col] || "0");
      // Check if row is a revenue row (contains "Revenue" in name)
      if (row.toLowerCase().includes("revenue")) {
        total += value;
      } else {
        total -= value;
      }
    });
    return total.toFixed(2);
  };


  // Validate and continue
  const handleContinue = () => {
    // Check if at least one cell has data
    let hasData = false;
    rowLabels.forEach(row => {
      columnLabels.forEach(col => {
        if (financialData[row]?.[col.key] && parseFloat(financialData[row][col.key]) !== 0) {
          hasData = true;
        }
      });
    });

    if (!hasData) {
      toast.error("Please enter financial data in at least one cell");
      return;
    }

    onNext({
      financialType,
      rowLabels,
      columnLabels,
      financialData,
    });
  };

  const columnWidth = 280;

  return (
    <div
      style={{
        width: '1494px',
        maxWidth: '100%',
        height: '1259px',
        borderRadius: '32px',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        background: 'rgba(255, 255, 255, 1)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Heading */}
      <h2
        style={{
          fontFamily: 'Lufga',
          fontWeight: 500,
          fontStyle: 'normal',
          fontSize: '32px',
          lineHeight: '140%',
          letterSpacing: '0%',
          color: 'rgba(0, 0, 0, 1)',
          marginBottom: '12px',
        }}
      >
        Financials
      </h2>

      {/* Description */}
      <p
        style={{
          fontFamily: 'Lufga',
          fontWeight: 500,
          fontStyle: 'normal',
          fontSize: '20px',
          lineHeight: '140%',
          letterSpacing: '0%',
          color: 'rgba(0, 0, 0, 0.5)',
          marginBottom: '24px',
        }}
      >
        Choose if you want to show numbers detailed or simple. We recommend strongly detailed!
      </p>

      {/* Toggle Buttons */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <button
          onClick={() => setFinancialType("detailed")}
          style={{
            width: '188.5px',
            height: '56px',
            borderRadius: '62px',
            paddingTop: '13px',
            paddingRight: '16px',
            paddingBottom: '13px',
            paddingLeft: '16px',
            background: financialType === "detailed" ? 'rgba(198, 254, 31, 1)' : 'rgba(238, 238, 238, 1)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'Lufga',
              fontWeight: 600,
              fontStyle: 'normal',
              fontSize: '16px',
              lineHeight: '160%',
              letterSpacing: '0%',
              textAlign: 'center',
              color: 'rgba(0, 0, 0, 1)',
            }}
          >
            Detailed
          </span>
        </button>
        <button
          onClick={() => setFinancialType("simple")}
          style={{
            width: '188.5px',
            height: '56px',
            borderRadius: '62px',
            paddingTop: '13px',
            paddingRight: '16px',
            paddingBottom: '13px',
            paddingLeft: '16px',
            background: financialType === "simple" ? 'rgba(198, 254, 31, 1)' : 'rgba(238, 238, 238, 1)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'Lufga',
              fontWeight: 600,
              fontStyle: 'normal',
              fontSize: '16px',
              lineHeight: '160%',
              letterSpacing: '0%',
              textAlign: 'center',
              color: 'rgba(0, 0, 0, 1)',
            }}
          >
            Simple
          </span>
        </button>
      </div>

      {/* Profit & Loss Table Container */}
      <div
        style={{
          width: '1400px',
          maxWidth: '100%',
          height: '990.12px',
          border: '4.14px solid rgba(255, 255, 255, 1)',
          borderRadius: '16.57px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Black Header Section */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: `${columnWidth * (columnLabels.length + 1)}px`,
            height: '108.62px',
            backgroundColor: '#000000',
            marginBottom: 0,
          }}
        >
          <h3 
            className="font-lufga text-white text-center px-2"
            style={{
              fontFamily: 'Lufga',
              fontWeight: 600,
              fontStyle: 'normal',
              fontSize: '49.7px',
              lineHeight: '100%',
              letterSpacing: '0%',
              color: 'rgba(255, 255, 255, 1)',
            }}
          >
            Profit & Loss
          </h3>
        </div>

        {/* Green Header Row */}
        <div 
          className="flex"
          style={{
            width: `${columnWidth * (columnLabels.length + 1)}px`,
            height: '76.03px',
            backgroundColor: '#C6FE1F',
          }}
        >
          <div 
            className="flex items-center px-4"
            style={{
              width: `${columnWidth}px`,
              height: '100%',
              border: '2.66px solid rgba(255, 255, 255, 1)',
            }}
          >
            <span 
              className="font-lufga text-black"
              style={{
                fontFamily: 'Lufga',
                fontWeight: 700,
                fontStyle: 'normal',
                fontSize: '33.14px',
                lineHeight: '100%',
                letterSpacing: '0%',
                color: 'rgba(0, 0, 0, 1)',
              }}
            >
              Zeitraum
            </span>
          </div>
          {columnLabels.map((col) => (
            <div 
              key={col.key}
              className="flex items-center justify-center"
              style={{
                width: `${columnWidth}px`,
                height: '100%',
                border: '2.66px solid rgba(255, 255, 255, 1)',
              }}
            >
              <span 
                className="font-lufga text-black text-center px-1"
                style={{
                  fontFamily: 'Lufga',
                  fontWeight: 700,
                  fontStyle: 'normal',
                  fontSize: '33.14px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  color: 'rgba(0, 0, 0, 1)',
                }}
              >
                {col.label}
              </span>
            </div>
          ))}
        </div>

        {/* Data Rows */}
        <div>
          {rowLabels.map((row, index) => {
            const isGrossRevenue = row === "Gross Revenue";
            const bgColor = isGrossRevenue ? 'rgba(255, 255, 255, 1)' : '#F3F8E8';
            const textColor = isGrossRevenue ? 'rgba(0, 0, 0, 1)' : 'rgba(0, 0, 0, 1)';
                
            return (
              <div 
                key={row}
                className="flex"
                style={{
                  width: `${columnWidth * (columnLabels.length + 1)}px`,
                  height: '91.12px',
                  backgroundColor: bgColor,
                }}
              >
                <div 
                  className={`flex items-center px-4`}
                  style={{
                    width: `${columnWidth}px`,
                    height: '100%',
                    border: '2.66px solid rgba(255, 255, 255, 1)',
                  }}
                >
                  <span 
                    className="font-lufga break-words"
                    style={{
                      fontFamily: 'Lufga',
                      fontWeight: 500,
                      fontStyle: 'normal',
                      fontSize: '24.85px',
                      lineHeight: '100%',
                      letterSpacing: '0%',
                      color: textColor,
                    }}
                  >
                    {row}
                  </span>
                </div>
                {columnLabels.map((col) => (
                  <div 
                    key={col.key}
                    className="flex items-center justify-center"
                    style={{
                      width: `${columnWidth}px`,
                      height: '100%',
                      backgroundColor: bgColor,
                      border: '2.66px solid rgba(255, 255, 255, 1)',
                    }}
                  >
                    <Input
                      type="number"
                      value={financialData[row]?.[col.key] || ""}
                      onChange={(e) => handleCellChange(row, col.key, e.target.value)}
                      className="w-11/12 text-center border-2 bg-transparent"
                      style={{
                        fontFamily: 'Lufga',
                        fontWeight: 500,
                        fontStyle: 'normal',
                        fontSize: '24.85px',
                        lineHeight: '100%',
                        letterSpacing: '0%',
                        color: textColor,
                        borderColor: 'rgba(0, 0, 0, 0.3)',
                      }}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            );
          })}

          {/* Net Profit Row */}
          <div 
            className="flex"
            style={{
              width: `${columnWidth * (columnLabels.length + 1)}px`,
              height: '91.12px',
              backgroundColor: '#C6FE1F',
            }}
          >
            <div 
              className="flex items-center px-4"
              style={{
                width: `${columnWidth}px`,
                height: '100%',
                border: '2.66px solid rgba(255, 255, 255, 1)',
              }}
            >
              <span 
                className="font-lufga text-black break-words"
                style={{
                  fontFamily: 'Lufga',
                  fontWeight: 700,
                  fontStyle: 'normal',
                  fontSize: '24.85px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  color: 'rgba(0, 0, 0, 1)',
                }}
              >
                Net Profit
              </span>
            </div>
            {columnLabels.map((col) => {
              const profit = calculateNetProfit(col.key);
              return (
                <div 
                  key={col.key}
                  className="flex items-center justify-center"
                  style={{
                    width: `${columnWidth}px`,
                    height: '100%',
                    backgroundColor: '#C6FE1F',
                    border: '2.66px solid rgba(255, 255, 255, 1)',
                  }}
                >
                  <span 
                    className="font-lufga text-black px-1"
                    style={{
                      fontFamily: 'Lufga',
                      fontWeight: 700,
                      fontStyle: 'normal',
                      fontSize: '24.85px',
                      lineHeight: '100%',
                      letterSpacing: '0%',
                      color: 'rgba(0, 0, 0, 1)',
                    }}
                  >
                    {profit !== "0.00" ? profit : "-"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', gap: '16px', marginTop: 'auto', paddingTop: '24px' }}>
        <Button variant="outline" onClick={onBack} style={{ padding: '8px 32px' }}>
          Back
        </Button>
        <Button 
          onClick={handleContinue}
          className="bg-accent hover:bg-accent/90 text-accent-foreground"
          style={{ padding: '8px 64px', marginLeft: 'auto' }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};
