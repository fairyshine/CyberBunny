import { useState, type ReactNode } from 'react';
import { Button } from '../ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { FileCode, Globe, Calculator, FolderOpen } from '../icons';

interface WelcomeScreenProps {
  onStart: () => void;
}

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const [, setStep] = useState(0);

  const features: { icon: ReactNode; title: string; description: string }[] = [
    {
      icon: <FileCode className="w-7 h-7" />,
      title: 'Python 执行',
      description: '浏览器内 Python 运行时，支持科学计算库',
    },
    {
      icon: <Globe className="w-7 h-7" />,
      title: '网页搜索',
      description: '快速获取网络信息和实时资讯',
    },
    {
      icon: <Calculator className="w-7 h-7" />,
      title: '智能计算',
      description: '数学计算和数据分析能力',
    },
    {
      icon: <FolderOpen className="w-7 h-7" />,
      title: '文件管理',
      description: '沙盒文件系统，安全可靠',
    },
  ];

  const handleStart = () => {
    setStep(1);
    onStart();
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 sm:p-8 gradient-bg">
      <div className="max-w-3xl w-full animate-fade-in">
        {/* Logo & Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-foreground text-background mb-6 shadow-elegant-lg">
            <span className="text-4xl">🐰</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">
            CyberBunny
          </h1>
          <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
            浏览器端智能代理系统
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="border-elegant hover-lift transition-all duration-300"
            >
              <CardHeader className="pb-3">
                <div className="mb-3 text-foreground/80">{feature.icon}</div>
                <CardTitle className="text-base font-semibold tracking-tight">
                  {feature.title}
                </CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center space-y-4">
          <Button
            onClick={handleStart}
            size="lg"
            className="px-10 py-6 text-base font-medium shadow-elegant-lg hover-lift"
          >
            开始使用
          </Button>
          <p className="text-xs text-muted-foreground">
            在设置中配置 API Key 后即可使用完整功能
          </p>
        </div>

        {/* Quick Tips */}
        <div className="mt-12 p-6 rounded-lg border-elegant bg-muted/30">
          <p className="text-sm font-medium mb-3 text-foreground">
            快速开始
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="font-mono text-xs border-elegant">
              Python 代码执行
            </Badge>
            <Badge variant="outline" className="font-mono text-xs border-elegant">
              网页搜索
            </Badge>
            <Badge variant="outline" className="font-mono text-xs border-elegant">
              数学计算
            </Badge>
            <Badge variant="outline" className="font-mono text-xs border-elegant">
              文件操作
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
