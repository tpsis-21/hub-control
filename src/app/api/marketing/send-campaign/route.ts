import { NextRequest, NextResponse } from 'next/server'
import { createApiSupabaseClient } from '@/lib/supabase/api'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const { campaignId } = await request.json()
    
    const supabase = createApiSupabaseClient()
    
    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()
    
    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }
    
    // Get SMTP configuration
    const { data: smtpConfig, error: smtpError } = await supabase
      .from('smtp_configs')
      .select('*')
      .eq('is_default', true)
      .single()
    
    if (smtpError || !smtpConfig) {
      return NextResponse.json(
        { error: 'No SMTP configuration found' },
        { status: 400 }
      )
    }
    
    // Create transporter
    const transporter = nodemailer.createTransporter({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.security === 'ssl',
      auth: {
        user: smtpConfig.username,
        pass: smtpConfig.password,
      },
    })
    
    // Get recipients based on segmentation
    let recipientsQuery = supabase.from('clients').select('email, name')
    
    if (campaign.segmentation && campaign.segmentation !== 'all') {
      // Apply segmentation filters
      const segmentation = JSON.parse(campaign.segmentation)
      if (segmentation.status) {
        recipientsQuery = recipientsQuery.eq('status', segmentation.status)
      }
      if (segmentation.plan) {
        recipientsQuery = recipientsQuery.eq('plan', segmentation.plan)
      }
    }
    
    const { data: recipients, error: recipientsError } = await recipientsQuery
    
    if (recipientsError) {
      return NextResponse.json(
        { error: 'Failed to get recipients' },
        { status: 500 }
      )
    }
    
    let sentCount = 0
    let failedCount = 0
    
    // Send emails
    for (const recipient of recipients || []) {
      try {
        // Replace variables in content
        let htmlContent = campaign.html_content
        htmlContent = htmlContent.replace(/{{nome}}/g, recipient.name || '')
        htmlContent = htmlContent.replace(/{{email}}/g, recipient.email || '')
        
        await transporter.sendMail({
          from: smtpConfig.from_email,
          to: recipient.email,
          subject: campaign.subject,
          html: htmlContent,
        })
        
        // Log successful send
        await supabase.from('email_logs').insert({
          campaign_id: campaignId,
          recipient_email: recipient.email,
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        
        sentCount++
      } catch (error) {
        // Log failed send
        await supabase.from('email_logs').insert({
          campaign_id: campaignId,
          recipient_email: recipient.email,
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          sent_at: new Date().toISOString(),
        })
        
        failedCount++
      }
    }
    
    // Update campaign status
    await supabase
      .from('marketing_campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_count: sentCount,
      })
      .eq('id', campaignId)
    
    return NextResponse.json({
      success: true,
      sentCount,
      failedCount,
    })
  } catch (error) {
    console.error('Error sending campaign:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}