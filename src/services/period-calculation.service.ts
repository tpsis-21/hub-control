/**
 * Period Calculation Service
 * 
 * Centralizes all period calculation logic for different IPTV panel types.
 * Supports both days-based and months-based calculations with flexible configuration.
 */

import { addDays, addMonths, endOfMonth, setDate, isValid } from 'date-fns';

// Types for period calculation configuration
export interface ServerPeriodConfig {
  period_calculation_type: 'days' | 'months';
  period_calculation_config: {
    type?: 'days' | 'months';
    strict?: boolean;
    allowPartialDays?: boolean;
    dayOfMonth?: 'same' | 'endOfMonth' | 'fixed';
    fixedDay?: number;
    handleInvalidDates?: 'lastDayOfMonth' | 'nextValidDay' | 'previousValidDay';
    fallbackToDays?: boolean;
  };
}

export interface PlanPeriodConfig {
  period_type: 'days' | 'months';
  period_config: {
    months?: number;
    days?: number;
    strict?: boolean;
  };
}

export interface PeriodCalculationResult {
  expirationDate: Date;
  calculationType: 'days' | 'months';
  originalValue: number;
  convertedValue?: number;
  warnings?: string[];
}

export interface PanelIdentificationConfig {
  panelType: 'natv' | 'thebest' | 'generic';
  userIdentification: 'id' | 'username' | 'both';
  supportsCredits: boolean;
  periodCalculationType: 'days' | 'months';
}

export class PeriodCalculationService {
  
  /**
   * Main method to calculate expiration date based on server and plan configuration
   */
  static calculateExpirationDate(
    baseDate: Date,
    planValidity: number,
    serverConfig: ServerPeriodConfig,
    planConfig?: PlanPeriodConfig
  ): PeriodCalculationResult {
    const warnings: string[] = [];
    
    // Validate input date
    if (!isValid(baseDate)) {
      throw new Error('Invalid base date provided');
    }
    
    // Determine calculation type based on server configuration
    const calculationType = serverConfig.period_calculation_type;
    const config = serverConfig.period_calculation_config;
    
    let expirationDate: Date;
    let convertedValue: number | undefined;
    
    switch (calculationType) {
      case 'days':
        expirationDate = this.calculateDaysExpiration(baseDate, planValidity, config);
        break;
        
      case 'months':
        // Convert days to months if needed
        const months = planConfig?.period_config?.months || this.convertDaysToMonths(planValidity);
        convertedValue = months;
        expirationDate = this.calculateMonthsExpiration(baseDate, months, config);
        
        if (months !== planValidity) {
          warnings.push(`Converted ${planValidity} days to ${months} months for panel compatibility`);
        }
        break;
        
      default:
        // Fallback to days
        expirationDate = addDays(baseDate, planValidity);
        warnings.push('Unknown calculation type, falling back to days');
    }
    
    return {
      expirationDate,
      calculationType,
      originalValue: planValidity,
      convertedValue,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
  
  /**
   * Calculate expiration using days (exact calculation)
   */
  private static calculateDaysExpiration(
    baseDate: Date,
    days: number,
    config: ServerPeriodConfig['period_calculation_config']
  ): Date {
    if (config.strict && !Number.isInteger(days)) {
      throw new Error('Strict mode requires integer days');
    }
    
    return addDays(baseDate, Math.floor(days));
  }
  
  /**
   * Calculate expiration using months (calendar months - real month calculation)
   */
  private static calculateMonthsExpiration(
    baseDate: Date,
    months: number,
    config: ServerPeriodConfig['period_calculation_config']
  ): Date {
    const result = new Date(baseDate);
    
    // Add months first
    const withMonths = addMonths(result, months);
    
    // Apply day-of-month strategy
    switch (config.dayOfMonth) {
      case 'same':
        // Keep the same day of month (default behavior of addMonths)
        return withMonths;
        
      case 'endOfMonth':
        // Always go to the last day of the target month
        return endOfMonth(withMonths);
        
      case 'fixed':
        // Set to a fixed day of the month
        const fixedDay = config.fixedDay || 1;
        try {
          return setDate(withMonths, fixedDay);
        } catch (error) {
          // Handle invalid dates (e.g., Feb 31)
          return this.handleInvalidDate(withMonths, fixedDay, config.handleInvalidDates);
        }
        
      default:
        return withMonths;
    }
  }
  
  /**
   * Handle invalid dates when setting fixed day of month
   */
  private static handleInvalidDate(
    date: Date,
    targetDay: number,
    strategy: string = 'lastDayOfMonth'
  ): Date {
    switch (strategy) {
      case 'lastDayOfMonth':
        return endOfMonth(date);
        
      case 'nextValidDay':
        // Try the next month with the target day
        const nextMonth = addMonths(date, 1);
        try {
          return setDate(nextMonth, targetDay);
        } catch {
          return endOfMonth(date);
        }
        
      case 'previousValidDay':
        // Use the last valid day of the current month
        return endOfMonth(date);
        
      default:
        return endOfMonth(date);
    }
  }
  
  /**
   * Convert days to months using TheBest calendar month standard
   */
  static convertDaysToMonths(days: number): number {
    // Using TheBest calendar standard: real months (28-31 days)
    // Average days per month considering leap years
    const averageDaysPerMonth = 365.25 / 12; // ~30.44 days
    return Math.round(days / averageDaysPerMonth);
  }
  
  /**
   * Convert months to days using TheBest calendar month standard
   */
  static convertMonthsToDays(months: number): number {
    // Using TheBest calendar standard: real months (28-31 days)
    // Average days per month considering leap years
    const averageDaysPerMonth = 365.25 / 12; // ~30.44 days
    return Math.round(months * averageDaysPerMonth);
  }
  
  /**
   * Identify the best period representation for a given panel
   */
  static identifyBestPeriod(
    planValidity: number,
    serverConfig: ServerPeriodConfig
  ): { value: number; unit: 'days' | 'months'; confidence: number } {
    if (serverConfig.period_calculation_type === 'months') {
      const months = this.convertDaysToMonths(planValidity);
      const backToDays = this.convertMonthsToDays(months);
      const accuracy = 1 - Math.abs(planValidity - backToDays) / planValidity;
      
      return {
        value: months,
        unit: 'months',
        confidence: accuracy
      };
    }
    
    return {
      value: planValidity,
      unit: 'days',
      confidence: 1.0
    };
  }
  
  /**
   * Validate server period configuration
   */
  static validateServerConfig(config: ServerPeriodConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check required fields
    if (!config.period_calculation_type) {
      errors.push('period_calculation_type is required');
    }
    
    if (!['days', 'months'].includes(config.period_calculation_type)) {
      errors.push('period_calculation_type must be "days" or "months"');
    }
    
    // Validate configuration object
    const periodConfig = config.period_calculation_config;
    if (periodConfig) {
      if (periodConfig.fixedDay && (periodConfig.fixedDay < 1 || periodConfig.fixedDay > 31)) {
        errors.push('fixedDay must be between 1 and 31');
      }
      
      if (periodConfig.dayOfMonth === 'fixed' && !periodConfig.fixedDay) {
        errors.push('fixedDay is required when dayOfMonth is "fixed"');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Get panel identification configuration based on server type
   */
  static getPanelIdentificationConfig(serverName: string, apiUrl: string): PanelIdentificationConfig {
    const name = serverName.toLowerCase();
    const url = apiUrl.toLowerCase();
    
    // NATV Panel
    if (name.includes('natv') || url.includes('natv')) {
      return {
        panelType: 'natv',
        userIdentification: 'both', // Can use ID or username
        supportsCredits: true,
        periodCalculationType: 'days'
      };
    }
    
    // The Best Panel
    if (name.includes('thebest') || name.includes('the best') || url.includes('thebest')) {
      return {
        panelType: 'thebest',
        userIdentification: 'id', // Only uses ID
        supportsCredits: true,
        periodCalculationType: 'months'
      };
    }
    
    // Generic panel
    return {
      panelType: 'generic',
      userIdentification: 'id',
      supportsCredits: false,
      periodCalculationType: 'days'
    };
  }
  
  /**
   * Create default server configuration based on panel type
   */
  static createDefaultServerConfig(panelType: 'natv' | 'thebest' | 'generic'): ServerPeriodConfig {
    switch (panelType) {
      case 'natv':
        return {
          period_calculation_type: 'days',
          period_calculation_config: {
            type: 'days',
            strict: true,
            allowPartialDays: false
          }
        };
        
      case 'thebest':
        return {
          period_calculation_type: 'months',
          period_calculation_config: {
            type: 'months',
            dayOfMonth: 'same',
            handleInvalidDates: 'lastDayOfMonth'
          }
        };
        
      case 'generic':
      default:
        return {
          period_calculation_type: 'days',
          period_calculation_config: {
            type: 'days',
            strict: false,
            fallbackToDays: true
          }
        };
    }
  }
  
  /**
   * Identifica a melhor representação de período para um painel específico
   */
  static identifyBestPeriodRepresentation(
    days: number,
    panelConfig: PanelIdentificationConfig
  ): { value: number; unit: 'days' | 'months'; isExact: boolean; originalDays: number } {
    const monthsFromDays = this.convertDaysToMonths(days);
    
    // Se o painel prefere meses e a conversão é razoável
    if (panelConfig.periodCalculationType === 'months') {
      return {
        value: monthsFromDays,
        unit: 'months',
        isExact: true,
        originalDays: days
      };
    }
    
    // Se o painel prefere dias ou a conversão não é exata
    return {
      value: days,
      unit: 'days',
      isExact: true,
      originalDays: days
    };
  }

  /**
   * Calcula o período de renovação baseado na validade do plano e configuração do painel
   */
  static calculateRenewalPeriod(
    planValidityDays: number,
    panelConfig: PanelIdentificationConfig
  ): { value: number; unit: 'days' | 'months' } {
    const periodResult = this.identifyBestPeriodRepresentation(planValidityDays, panelConfig);
    
    return {
      value: periodResult.value,
      unit: periodResult.unit
    };
  }
}

// Types are already exported above as interfaces
