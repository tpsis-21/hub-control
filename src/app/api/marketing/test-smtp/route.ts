import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const { host, port, security, username, password, fromEmail, testEmail } = await request.json()
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: security === 'ssl',
      auth: {
        user: username,
        pass: password,
      },
    })
    
    // Verify connection
    await transporter.verify()
    
    // Send test email
    await transporter.sendMail({
      from: fromEmail,
      to: testEmail,
      subject: 'Teste de Configuração SMTP - Hub Control',
      html: `
        <h2>Teste de Configuração SMTP</h2>
        <p>Este é um email de teste para verificar se a configuração SMTP está funcionando corretamente.</p>
        <p><strong>Configuração testada:</strong></p>
        <ul>
          <li>Host: ${host}</li>
          <li>Porta: ${port}</li>
          <li>Segurança: ${security}</li>
          <li>Usuário: ${username}</li>
        </ul>
        <p>Se você recebeu este email, a configuração está funcionando perfeitamente!</p>
        <hr>
        <p><small>Hub Control - Sistema de Gestão</small></p>
      `,
    })
    
    return NextResponse.json({
      success: true,
      message: 'Teste enviado com sucesso!',
    })
  } catch (error) {
    console.error('SMTP test error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      },
      { status: 400 }
    )
  }
}
