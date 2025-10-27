/**
 * Analisador de Heatmap
 * 
 * Componente para visualizar padrões de interação do usuário
 * através de heatmaps de cliques, scroll e hover.
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ============================================
// INTERFACES E TIPOS
// ============================================

interface HeatmapPoint {
  x: number;
  y: number;
  intensity: number;
  timestamp: number;
  type: 'click' | 'hover' | 'scroll';
  element?: string;
  duration?: number;
}

interface HeatmapData {
  points: HeatmapPoint[];
  viewport: { width: number; height: number };
  page: string;
  sessionId: string;
  timestamp: number;
}

interface HeatmapConfig {
  radius: number;
  blur: number;
  maxOpacity: number;
  minOpacity: number;
  gradient: Record<string, string>;
}

interface HeatmapStats {
  totalInteractions: number;
  hotspots: Array<{
    x: number;
    y: number;
    intensity: number;
    element?: string;
  }>;
  coldSpots: Array<{
    x: number;
    y: number;
    element?: string;
  }>;
  averageIntensity: number;
  interactionDensity: number;
}

// ============================================
// COLETOR DE DADOS DE HEATMAP
// ============================================

class HeatmapCollector {
  private points: HeatmapPoint[] = [];
  private isCollecting: boolean = false;
  private sessionId: string;
  private viewport: { width: number; height: number };
  private listeners: Array<() => void> = [];

  constructor() {
    this.sessionId = this.generateSessionId();
    this.viewport = this.getViewport();
    this.setupEventListeners();
  }

  // Configurar event listeners
  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;

    // Listener de cliques
    const clickListener = (event: MouseEvent) => {
      if (!this.isCollecting) return;
      
      this.addPoint({
        x: event.clientX,
        y: event.clientY,
        intensity: 1,
        timestamp: Date.now(),
        type: 'click',
        element: this.getElementSelector(event.target as HTMLElement)
      });
    };

    // Listener de hover
    const hoverListener = (event: MouseEvent) => {
      if (!this.isCollecting) return;
      
      this.addPoint({
        x: event.clientX,
        y: event.clientY,
        intensity: 0.3,
        timestamp: Date.now(),
        type: 'hover',
        element: this.getElementSelector(event.target as HTMLElement)
      });
    };

    // Listener de scroll
    const scrollListener = () => {
      if (!this.isCollecting) return;
      
      this.addPoint({
        x: window.innerWidth / 2,
        y: window.scrollY + window.innerHeight / 2,
        intensity: 0.5,
        timestamp: Date.now(),
        type: 'scroll'
      });
    };

    // Listener de resize
    const resizeListener = () => {
      this.viewport = this.getViewport();
    };

    // Adicionar listeners
    document.addEventListener('click', clickListener);
    document.addEventListener('mousemove', hoverListener);
    window.addEventListener('scroll', scrollListener, { passive: true });
    window.addEventListener('resize', resizeListener);

    // Armazenar para limpeza
    this.listeners = [
      () => document.removeEventListener('click', clickListener),
      () => document.removeEventListener('mousemove', hoverListener),
      () => window.removeEventListener('scroll', scrollListener),
      () => window.removeEventListener('resize', resizeListener)
    ];
  }

  // Adicionar ponto ao heatmap
  private addPoint(point: HeatmapPoint): void {
    this.points.push(point);
    
    // Limitar número de pontos para performance
    if (this.points.length > 10000) {
      this.points = this.points.slice(-5000);
    }
  }

  // Obter seletor do elemento
  private getElementSelector(element: HTMLElement): string {
    if (!element) return 'unknown';
    
    if (element.id) return `#${element.id}`;
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.length > 0);
      if (classes.length > 0) return `.${classes[0]}`;
    }
    return element.tagName.toLowerCase();
  }

  // Obter viewport atual
  private getViewport(): { width: number; height: number } {
    if (typeof window === 'undefined') {
      return { width: 1920, height: 1080 };
    }
    
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }

  // Gerar ID de sessão
  private generateSessionId(): string {
    return `heatmap_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  // Iniciar coleta
  startCollecting(): void {
    this.isCollecting = true;
  }

  // Parar coleta
  stopCollecting(): void {
    this.isCollecting = false;
  }

  // Obter dados do heatmap
  getHeatmapData(type?: 'click' | 'hover' | 'scroll'): HeatmapData {
    const filteredPoints = type 
      ? this.points.filter(p => p.type === type)
      : this.points;

    return {
      points: filteredPoints,
      viewport: this.viewport,
      page: typeof window !== 'undefined' ? window.location.pathname : '/',
      sessionId: this.sessionId,
      timestamp: Date.now()
    };
  }

  // Calcular estatísticas
  calculateStats(type?: 'click' | 'hover' | 'scroll'): HeatmapStats {
    const data = this.getHeatmapData(type);
    const points = data.points;

    if (points.length === 0) {
      return {
        totalInteractions: 0,
        hotspots: [],
        coldSpots: [],
        averageIntensity: 0,
        interactionDensity: 0
      };
    }

    // Calcular intensidade média
    const averageIntensity = points.reduce((sum, p) => sum + p.intensity, 0) / points.length;

    // Encontrar hotspots (áreas com alta densidade)
    const hotspots = this.findHotspots(points);

    // Encontrar cold spots (áreas sem interação)
    const coldSpots = this.findColdSpots(points);

    // Calcular densidade de interação
    const viewportArea = this.viewport.width * this.viewport.height;
    const interactionDensity = points.length / viewportArea * 1000000; // Por milhão de pixels

    return {
      totalInteractions: points.length,
      hotspots,
      coldSpots,
      averageIntensity,
      interactionDensity
    };
  }

  // Encontrar hotspots
  private findHotspots(points: HeatmapPoint[]): Array<{ x: number; y: number; intensity: number; element?: string }> {
    const gridSize = 50;
    const grid: Map<string, { count: number; intensity: number; elements: Set<string> }> = new Map();

    // Agrupar pontos em grid
    points.forEach(point => {
      const gridX = Math.floor(point.x / gridSize);
      const gridY = Math.floor(point.y / gridSize);
      const key = `${gridX},${gridY}`;

      if (!grid.has(key)) {
        grid.set(key, { count: 0, intensity: 0, elements: new Set() });
      }

      const cell = grid.get(key)!;
      cell.count++;
      cell.intensity += point.intensity;
      if (point.element) {
        cell.elements.add(point.element);
      }
    });

    // Encontrar células com alta densidade
    const hotspots: Array<{ x: number; y: number; intensity: number; element?: string }> = [];
    const threshold = points.length * 0.05; // 5% dos pontos

    grid.forEach((cell, key) => {
      if (cell.count >= threshold) {
        const [gridX, gridY] = key.split(',').map(Number);
        hotspots.push({
          x: gridX * gridSize + gridSize / 2,
          y: gridY * gridSize + gridSize / 2,
          intensity: cell.intensity / cell.count,
          element: Array.from(cell.elements)[0]
        });
      }
    });

    return hotspots.sort((a, b) => b.intensity - a.intensity).slice(0, 10);
  }

  // Encontrar cold spots
  private findColdSpots(points: HeatmapPoint[]): Array<{ x: number; y: number; element?: string }> {
    // Simplificado: áreas importantes sem interação
    const importantElements = document.querySelectorAll('button, a, input, [role="button"]');
    const coldSpots: Array<{ x: number; y: number; element?: string }> = [];

    importantElements.forEach(element => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Verificar se há interações próximas
      const hasNearbyInteraction = points.some(point => {
        const distance = Math.sqrt(
          Math.pow(point.x - centerX, 2) + Math.pow(point.y - centerY, 2)
        );
        return distance < 50; // 50px de raio
      });

      if (!hasNearbyInteraction && rect.width > 0 && rect.height > 0) {
        coldSpots.push({
          x: centerX,
          y: centerY,
          element: this.getElementSelector(element as HTMLElement)
        });
      }
    });

    return coldSpots.slice(0, 10);
  }

  // Limpar dados
  clearData(): void {
    this.points = [];
  }

  // Destruir coletor
  destroy(): void {
    this.stopCollecting();
    this.listeners.forEach(cleanup => cleanup());
    this.listeners = [];
  }
}

// ============================================
// RENDERIZADOR DE HEATMAP
// ============================================

class HeatmapRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: HeatmapConfig;

  constructor(canvas: HTMLCanvasElement, config?: Partial<HeatmapConfig>) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = {
      radius: 25,
      blur: 15,
      maxOpacity: 0.8,
      minOpacity: 0.1,
      gradient: {
        '0.0': 'rgba(0, 0, 255, 0)',
        '0.2': 'rgba(0, 0, 255, 0.5)',
        '0.4': 'rgba(0, 255, 0, 0.8)',
        '0.6': 'rgba(255, 255, 0, 0.9)',
        '0.8': 'rgba(255, 165, 0, 1)',
        '1.0': 'rgba(255, 0, 0, 1)'
      },
      ...config
    };
  }

  // Renderizar heatmap
  render(data: HeatmapData): void {
    const { points, viewport } = data;
    
    // Configurar canvas
    this.canvas.width = viewport.width;
    this.canvas.height = viewport.height;
    
    // Limpar canvas
    this.ctx.clearRect(0, 0, viewport.width, viewport.height);
    
    if (points.length === 0) return;
    
    // Criar gradiente radial para cada ponto
    points.forEach(point => {
      this.renderPoint(point);
    });
    
    // Aplicar gradiente de cores
    this.applyColorGradient();
  }

  // Renderizar ponto individual
  private renderPoint(point: HeatmapPoint): void {
    const gradient = this.ctx.createRadialGradient(
      point.x, point.y, 0,
      point.x, point.y, this.config.radius
    );
    
    const opacity = Math.min(
      this.config.maxOpacity,
      Math.max(this.config.minOpacity, point.intensity)
    );
    
    gradient.addColorStop(0, `rgba(0, 0, 0, ${opacity})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    this.ctx.globalCompositeOperation = 'screen';
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(point.x, point.y, this.config.radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  // Aplicar gradiente de cores
  private applyColorGradient(): void {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    
    // Criar lookup table para cores
    const colorLookup = this.createColorLookup();
    
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha > 0) {
        const intensity = alpha / 255;
        const color = this.getColorFromIntensity(intensity, colorLookup);
        
        data[i] = color.r;     // Red
        data[i + 1] = color.g; // Green
        data[i + 2] = color.b; // Blue
        data[i + 3] = color.a; // Alpha
      }
    }
    
    this.ctx.putImageData(imageData, 0, 0);
  }

  // Criar lookup table de cores
  private createColorLookup(): Array<{ r: number; g: number; b: number; a: number }> {
    const lookup: Array<{ r: number; g: number; b: number; a: number }> = [];
    
    for (let i = 0; i <= 255; i++) {
      const intensity = i / 255;
      const color = this.interpolateColor(intensity);
      lookup.push(color);
    }
    
    return lookup;
  }

  // Interpolar cor baseada na intensidade
  private interpolateColor(intensity: number): { r: number; g: number; b: number; a: number } {
    const gradientKeys = Object.keys(this.config.gradient).map(Number).sort((a, b) => a - b);
    
    // Encontrar posição no gradiente
    let lowerKey = 0;
    let upperKey = 1;
    
    for (let i = 0; i < gradientKeys.length - 1; i++) {
      if (intensity >= gradientKeys[i] && intensity <= gradientKeys[i + 1]) {
        lowerKey = gradientKeys[i];
        upperKey = gradientKeys[i + 1];
        break;
      }
    }
    
    // Interpolar entre as cores
    const lowerColor = this.parseColor(this.config.gradient[lowerKey.toString()]);
    const upperColor = this.parseColor(this.config.gradient[upperKey.toString()]);
    
    const ratio = (intensity - lowerKey) / (upperKey - lowerKey);
    
    return {
      r: Math.round(lowerColor.r + (upperColor.r - lowerColor.r) * ratio),
      g: Math.round(lowerColor.g + (upperColor.g - lowerColor.g) * ratio),
      b: Math.round(lowerColor.b + (upperColor.b - lowerColor.b) * ratio),
      a: Math.round(lowerColor.a + (upperColor.a - lowerColor.a) * ratio)
    };
  }

  // Obter cor da intensidade
  private getColorFromIntensity(
    intensity: number, 
    lookup: Array<{ r: number; g: number; b: number; a: number }>
  ): { r: number; g: number; b: number; a: number } {
    const index = Math.min(255, Math.max(0, Math.round(intensity * 255)));
    return lookup[index];
  }

  // Parsear cor RGBA
  private parseColor(colorString: string): { r: number; g: number; b: number; a: number } {
    const match = colorString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3]),
        a: match[4] ? Math.round(parseFloat(match[4]) * 255) : 255
      };
    }
    
    return { r: 0, g: 0, b: 0, a: 0 };
  }
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function HeatmapAnalyzer() {
  const [collector] = useState(() => new HeatmapCollector());
  const [isCollecting, setIsCollecting] = useState(false);
  const [heatmapType, setHeatmapType] = useState<'click' | 'hover' | 'scroll' | 'all'>('all');
  const [stats, setStats] = useState<HeatmapStats | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<HeatmapRenderer | null>(null);

  // Inicializar renderer
  useEffect(() => {
    if (canvasRef.current && !rendererRef.current) {
      rendererRef.current = new HeatmapRenderer(canvasRef.current);
    }
  }, []);

  // Atualizar heatmap periodicamente
  useEffect(() => {
    if (!isCollecting) return;

    const interval = setInterval(() => {
      updateHeatmap();
    }, 2000);

    return () => clearInterval(interval);
  }, [isCollecting, heatmapType]);

  // Função para atualizar heatmap
  const updateHeatmap = useCallback(() => {
    if (!rendererRef.current) return;

    const type = heatmapType === 'all' ? undefined : heatmapType;
    const data = collector.getHeatmapData(type);
    const newStats = collector.calculateStats(type);

    rendererRef.current.render(data);
    setStats(newStats);
  }, [collector, heatmapType]);

  // Iniciar/parar coleta
  const toggleCollecting = useCallback(() => {
    if (isCollecting) {
      collector.stopCollecting();
      setIsCollecting(false);
    } else {
      collector.startCollecting();
      setIsCollecting(true);
    }
  }, [collector, isCollecting]);

  // Limpar dados
  const clearData = useCallback(() => {
    collector.clearData();
    if (rendererRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setStats(null);
  }, [collector]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      collector.destroy();
    };
  }, [collector]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Análise de Heatmap</CardTitle>
              <CardDescription>
                Visualize padrões de interação do usuário em tempo real
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={heatmapType} onValueChange={(value: any) => setHeatmapType(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="click">Cliques</SelectItem>
                  <SelectItem value="hover">Hover</SelectItem>
                  <SelectItem value="scroll">Scroll</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={toggleCollecting}
                variant={isCollecting ? "destructive" : "default"}
              >
                {isCollecting ? 'Parar' : 'Iniciar'}
              </Button>
              <Button onClick={clearData} variant="outline">
                Limpar
              </Button>
              <Button onClick={updateHeatmap} variant="outline">
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.totalInteractions}</div>
              <div className="text-sm text-muted-foreground">Interações Totais</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.hotspots.length}</div>
              <div className="text-sm text-muted-foreground">Hotspots</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.coldSpots.length}</div>
              <div className="text-sm text-muted-foreground">Cold Spots</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.interactionDensity.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Densidade/M px</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Heatmap Canvas */}
      <Card>
        <CardContent className="p-0">
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="w-full h-auto border"
              style={{ maxHeight: '600px' }}
            />
            {!isCollecting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                <div className="text-center">
                  <div className="text-lg font-medium">Coleta Pausada</div>
                  <div className="text-sm text-muted-foreground">
                    Clique em "Iniciar" para começar a coletar dados
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Análise Detalhada */}
      {stats && (
        <Tabs defaultValue="hotspots" className="w-full">
          <TabsList>
            <TabsTrigger value="hotspots">Hotspots</TabsTrigger>
            <TabsTrigger value="coldspots">Cold Spots</TabsTrigger>
          </TabsList>
          
          <TabsContent value="hotspots">
            <Card>
              <CardHeader>
                <CardTitle>Áreas Mais Interativas</CardTitle>
                <CardDescription>
                  Regiões com maior concentração de interações
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.hotspots.map((hotspot, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded">
                      <div>
                        <div className="font-medium">
                          Posição: ({hotspot.x.toFixed(0)}, {hotspot.y.toFixed(0)})
                        </div>
                        {hotspot.element && (
                          <div className="text-sm text-muted-foreground">
                            Elemento: {hotspot.element}
                          </div>
                        )}
                      </div>
                      <Badge variant="secondary">
                        {(hotspot.intensity * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  ))}
                  {stats.hotspots.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      Nenhum hotspot detectado ainda
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="coldspots">
            <Card>
              <CardHeader>
                <CardTitle>Áreas Sem Interação</CardTitle>
                <CardDescription>
                  Elementos importantes que não receberam interações
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.coldSpots.map((coldspot, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded">
                      <div>
                        <div className="font-medium">
                          Posição: ({coldspot.x.toFixed(0)}, {coldspot.y.toFixed(0)})
                        </div>
                        {coldspot.element && (
                          <div className="text-sm text-muted-foreground">
                            Elemento: {coldspot.element}
                          </div>
                        )}
                      </div>
                      <Badge variant="destructive">
                        Sem interação
                      </Badge>
                    </div>
                  ))}
                  {stats.coldSpots.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      Todos os elementos importantes foram interagidos
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export default HeatmapAnalyzer;
