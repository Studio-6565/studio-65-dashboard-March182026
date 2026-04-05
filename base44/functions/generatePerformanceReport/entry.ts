import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import jsPDF from 'npm:jspdf@4.0.0';
import { formatDistanceToNow } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, clientEmail } = await req.json();

    if (!projectId) {
      return Response.json({ error: 'projectId required' }, { status: 400 });
    }

    // Fetch project and performance data
    const project = await base44.entities.Project.get('Project', projectId);
    const perfData = await base44.entities.ScriptPerformance.filter({
      project_id: projectId
    }, '-publish_date', 100);

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    // Calculate metrics
    const totalViews = perfData.reduce((s, p) => s + (p.views || 0), 0);
    const totalEngagement = perfData.reduce((s, p) => s + (p.likes || 0) + (p.shares || 0) + (p.comments || 0) + (p.saves || 0), 0);
    const avgRetention = perfData.length > 0 ? (perfData.reduce((s, p) => s + (p.retention_rate || 0), 0) / perfData.length).toFixed(1) : 0;
    const totalConversions = perfData.reduce((s, p) => s + (p.conversions || 0), 0);
    const engagementRate = totalViews > 0 ? ((totalEngagement / totalViews) * 100).toFixed(2) : 0;

    // Top performing script
    const topScript = perfData.reduce((max, current) => {
      return ((current.engagement_rate || 0) > (max.engagement_rate || 0)) ? current : max;
    }, perfData[0] || {});

    // Generate PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    // Header
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('Performance Report', margin, margin + 10);

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100);
    doc.text(`Project: ${project.name}`, margin, margin + 25);
    doc.text(`Client: ${project.client}`, margin, margin + 33);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, margin + 41);

    let yPos = margin + 55;

    // Summary metrics
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0);
    doc.text('Campaign Summary', margin, yPos);
    yPos += 12;

    const metricsText = [
      `Total Views: ${totalViews.toLocaleString()}`,
      `Total Engagement: ${totalEngagement.toLocaleString()}`,
      `Engagement Rate: ${engagementRate}%`,
      `Average Retention: ${avgRetention}%`,
      `Conversions: ${totalConversions}`,
      `Scripts Published: ${perfData.length}`
    ];

    doc.setFontSize(11);
    metricsText.forEach(text => {
      doc.text(text, margin, yPos);
      yPos += 8;
    });

    yPos += 8;

    // Performance by platform
    if (perfData.length > 0) {
      const platformMap = {};
      perfData.forEach(p => {
        if (!platformMap[p.platform]) {
          platformMap[p.platform] = { views: 0, engagement: 0, count: 0 };
        }
        platformMap[p.platform].views += p.views || 0;
        platformMap[p.platform].engagement += (p.likes || 0) + (p.shares || 0);
        platformMap[p.platform].count += 1;
      });

      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Performance by Platform', margin, yPos);
      yPos += 10;

      Object.entries(platformMap).forEach(([platform, data]) => {
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`${platform.toUpperCase()}: ${data.views.toLocaleString()} views, ${data.engagement.toLocaleString()} engagement`, margin + 5, yPos);
        yPos += 7;
      });

      yPos += 8;
    }

    // Top performing script
    if (topScript && topScript.script_title) {
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Top Performing Script', margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Title: ${topScript.script_title}`, margin + 5, yPos);
      yPos += 6;
      doc.text(`Type: ${topScript.script_type} | Platform: ${topScript.platform}`, margin + 5, yPos);
      yPos += 6;
      doc.text(`Views: ${(topScript.views || 0).toLocaleString()} | Engagement Rate: ${(topScript.engagement_rate || 0).toFixed(2)}%`, margin + 5, yPos);
      yPos += 6;
      doc.text(`Retention: ${(topScript.retention_rate || 0).toFixed(1)}% | Conversions: ${topScript.conversions || 0}`, margin + 5, yPos);
      yPos += 10;
    }

    // Recent scripts table
    if (perfData.length > 0) {
      yPos += 5;
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = margin;
      }

      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Recent Scripts', margin, yPos);
      yPos += 10;

      doc.setFontSize(9);
      const recentScripts = perfData.slice(0, 5);
      recentScripts.forEach(script => {
        const scriptLine = `${script.script_title} | ${script.platform} | ${script.views || 0} views | ${script.engagement_rate || 0}% engagement`;
        doc.text(scriptLine, margin + 5, yPos);
        yPos += 6;
      });
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('This report was auto-generated by Studio 65 Performance Analytics', margin, pageHeight - 10);

    const pdfBytes = doc.output('arraybuffer');

    // Send email if clientEmail provided
    if (clientEmail) {
      await base44.integrations.Core.SendEmail({
        to: clientEmail,
        subject: `${project.name} - Performance Report`,
        body: `Hi,\n\nAttached is your performance report for "${project.name}".\n\nKey metrics:\n- Total Views: ${totalViews.toLocaleString()}\n- Engagement Rate: ${engagementRate}%\n- Conversions: ${totalConversions}\n\nBest regards,\nStudio 65`
      });
    }

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${project.name}_report.pdf"`
      }
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});