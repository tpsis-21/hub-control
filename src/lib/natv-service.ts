// Serviço para integração com NATV
export interface NATVConfig {
  apiUrl: string;
  apiKey: string;
  enabled: boolean;
}

export interface NATVTestResult {
  success: boolean;
  message: string;
  data?: any;
}

export class NATVService {
  private config: NATVConfig;

  constructor(config: NATVConfig) {
    this.config = config;
  }

  async testConnection(): Promise<NATVTestResult> {
    if (!this.config.enabled) {
      return {
        success: false,
        message: 'Integração NATV não está habilitada'
      };
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/test`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        message: 'Conexão com NATV estabelecida com sucesso',
        data
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  async createUser(userData: any): Promise<NATVTestResult> {
    if (!this.config.enabled) {
      return {
        success: false,
        message: 'Integração NATV não está habilitada'
      };
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        message: 'Usuário criado com sucesso no NATV',
        data
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao criar usuário'
      };
    }
  }

  async updateUser(userId: string, userData: any): Promise<NATVTestResult> {
    if (!this.config.enabled) {
      return {
        success: false,
        message: 'Integração NATV não está habilitada'
      };
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        message: 'Usuário atualizado com sucesso no NATV',
        data
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao atualizar usuário'
      };
    }
  }

  async deleteUser(userId: string): Promise<NATVTestResult> {
    if (!this.config.enabled) {
      return {
        success: false,
        message: 'Integração NATV não está habilitada'
      };
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        success: true,
        message: 'Usuário removido com sucesso do NATV'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao remover usuário'
      };
    }
  }
}

export const createNATVService = (config: NATVConfig) => new NATVService(config);

// Instância singleton para compatibilidade
export const natvService = createNATVService({
  apiUrl: '',
  apiKey: '',
  enabled: false
});
