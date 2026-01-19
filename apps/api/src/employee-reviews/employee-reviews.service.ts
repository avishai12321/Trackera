import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { CreateEmployeeReviewDto, UpdateEmployeeReviewDto } from '@time-tracker/dto';
import { SupabaseService } from '../shared/supabase.service';
import PDFDocument from 'pdfkit';

@Injectable()
export class EmployeeReviewsService {
    private readonly logger = new Logger(EmployeeReviewsService.name);
    constructor(private supabase: SupabaseService) { }

    async create(createDto: CreateEmployeeReviewDto, tenantId: string, userId: string) {
        this.logger.log(`Creating employee review for tenant: ${tenantId}, user: ${userId}`);

        const tenantClient = this.supabase.getClientForTenant(tenantId);

        // Get reviewer's employee record
        const { data: reviewer, error: reviewerError } = await tenantClient
            .from('employees')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (reviewerError || !reviewer) {
            throw new ForbiddenException('You must have an employee record to write reviews');
        }

        const insertData = {
            tenant_id: tenantId,
            employee_id: createDto.employeeId,
            reviewer_id: reviewer.id,
            review_date: createDto.reviewDate || new Date().toISOString().split('T')[0],
            score_presentation: createDto.scorePresentation || null,
            score_time_management: createDto.scoreTimeManagement || null,
            score_excel_skills: createDto.scoreExcelSkills || null,
            score_proficiency: createDto.scoreProficiency || null,
            score_transparency: createDto.scoreTransparency || null,
            score_creativity: createDto.scoreCreativity || null,
            score_overall: createDto.scoreOverall || null,
            positive_skills: createDto.positiveSkills || [],
            improvement_skills: createDto.improvementSkills || [],
            action_items: createDto.actionItems || null,
            employee_commentary: createDto.employeeCommentary || null,
        };

        const { data, error } = await tenantClient
            .from('employee_reviews')
            .insert(insertData)
            .select()
            .single();

        if (error) {
            this.logger.error(`Failed to create review: ${error.message}`);
            throw new Error(`Failed to create review: ${error.message}`);
        }

        this.logger.log(`Employee review created successfully: ${data.id}`);
        return data;
    }

    async findAll(tenantId: string, employeeId?: string) {
        const tenantClient = this.supabase.getClientForTenant(tenantId);

        let query = tenantClient
            .from('employee_reviews')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('review_date', { ascending: false });

        if (employeeId) {
            query = query.eq('employee_id', employeeId);
        }

        const { data: reviews, error } = await query;

        if (error) throw new Error(`Failed to fetch reviews: ${error.message}`);
        if (!reviews || reviews.length === 0) return [];

        // Get unique employee and reviewer IDs
        const employeeIds = [...new Set(reviews.map(r => r.employee_id).filter(Boolean))];
        const reviewerIds = [...new Set(reviews.map(r => r.reviewer_id).filter(Boolean))];
        const allIds = [...new Set([...employeeIds, ...reviewerIds])];

        const { data: employees } = await tenantClient
            .from('employees')
            .select('id, first_name, last_name, position, department')
            .in('id', allIds);

        const employeesMap = new Map((employees || []).map(e => [e.id, e]));

        return reviews.map(review => ({
            ...review,
            employee: review.employee_id ? employeesMap.get(review.employee_id) || null : null,
            reviewer: review.reviewer_id ? employeesMap.get(review.reviewer_id) || null : null,
        }));
    }

    async findOne(id: string, tenantId: string) {
        const tenantClient = this.supabase.getClientForTenant(tenantId);

        const { data: review, error } = await tenantClient
            .from('employee_reviews')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !review) {
            throw new NotFoundException(`Review #${id} not found`);
        }

        // Fetch employee and reviewer
        const ids = [review.employee_id, review.reviewer_id].filter(Boolean);
        const { data: employees } = await tenantClient
            .from('employees')
            .select('id, first_name, last_name, position, department')
            .in('id', ids);

        const employeesMap = new Map((employees || []).map(e => [e.id, e]));

        return {
            ...review,
            employee: review.employee_id ? employeesMap.get(review.employee_id) || null : null,
            reviewer: review.reviewer_id ? employeesMap.get(review.reviewer_id) || null : null,
        };
    }

    async update(id: string, updateDto: UpdateEmployeeReviewDto, tenantId: string, userId: string) {
        const tenantClient = this.supabase.getClientForTenant(tenantId);

        const updateData: any = {};
        if (updateDto.reviewDate !== undefined) updateData.review_date = updateDto.reviewDate;
        if (updateDto.scorePresentation !== undefined) updateData.score_presentation = updateDto.scorePresentation;
        if (updateDto.scoreTimeManagement !== undefined) updateData.score_time_management = updateDto.scoreTimeManagement;
        if (updateDto.scoreExcelSkills !== undefined) updateData.score_excel_skills = updateDto.scoreExcelSkills;
        if (updateDto.scoreProficiency !== undefined) updateData.score_proficiency = updateDto.scoreProficiency;
        if (updateDto.scoreTransparency !== undefined) updateData.score_transparency = updateDto.scoreTransparency;
        if (updateDto.scoreCreativity !== undefined) updateData.score_creativity = updateDto.scoreCreativity;
        if (updateDto.scoreOverall !== undefined) updateData.score_overall = updateDto.scoreOverall;
        if (updateDto.positiveSkills !== undefined) updateData.positive_skills = updateDto.positiveSkills;
        if (updateDto.improvementSkills !== undefined) updateData.improvement_skills = updateDto.improvementSkills;
        if (updateDto.actionItems !== undefined) updateData.action_items = updateDto.actionItems;
        if (updateDto.employeeCommentary !== undefined) updateData.employee_commentary = updateDto.employeeCommentary;

        const { data, error } = await tenantClient
            .from('employee_reviews')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(`Failed to update review: ${error.message}`);
        return data;
    }

    async remove(id: string, tenantId: string) {
        const tenantClient = this.supabase.getClientForTenant(tenantId);

        const { error } = await tenantClient
            .from('employee_reviews')
            .delete()
            .eq('id', id);

        if (error) throw new Error(`Failed to delete review: ${error.message}`);
        return { success: true };
    }

    async generatePdf(id: string, tenantId: string): Promise<Buffer> {
        const review = await this.findOne(id, tenantId);
        const tenantClient = this.supabase.getClientForTenant(tenantId);

        // Fetch full employee details for deep dive
        let employeeDetails: any = null;
        if (review.employee_id) {
            const { data } = await tenantClient
                .from('employees')
                .select('*')
                .eq('id', review.employee_id)
                .single();
            employeeDetails = data;
        }

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 40, size: 'A4' });
            const chunks: Buffer[] = [];

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const pageWidth = doc.page.width - 80; // margins
            const cardWidth = (pageWidth - 30) / 4; // 4 cards per row with gaps
            const cardHeight = 80;
            const gapX = 10;
            const gapY = 12;
            const startX = 40;
            let currentY = 40;

            // Colors
            const cardBg = '#f8fafc';
            const borderColor = '#e2e8f0';
            const headerColor = '#64748b';
            const valueColor = '#1e293b';

            // Icon colors for each card type
            const iconColors: Record<string, string> = {
                'Employee': '#6366f1',        // indigo
                'Presentation Skills': '#8b5cf6', // violet
                'Time Management': '#3b82f6', // blue
                'Excel Skills': '#10b981',    // emerald
                'Proficiency': '#f59e0b',     // amber
                'Transparency': '#06b6d4',    // cyan
                'Creativity': '#ec4899',      // pink
                'Overall': '#22c55e',         // green
            };

            // Helper to draw icon based on type
            const drawIcon = (x: number, y: number, type: string, color: string) => {
                const iconSize = 20;
                const cx = x + iconSize / 2;
                const cy = y + iconSize / 2;

                // Draw circular background
                doc.circle(cx, cy, iconSize / 2).fill(color + '20'); // Light background

                doc.fillColor(color);
                doc.strokeColor(color);
                doc.lineWidth(1.5);

                switch (type) {
                    case 'Employee':
                        // Person icon - head and body
                        doc.circle(cx, cy - 3, 4).fill(color);
                        doc.moveTo(cx - 5, cy + 8).lineTo(cx - 5, cy + 4).bezierCurveTo(cx - 5, cy + 1, cx + 5, cy + 1, cx + 5, cy + 4).lineTo(cx + 5, cy + 8).stroke();
                        break;
                    case 'Presentation Skills':
                        // Presentation/screen icon
                        doc.rect(cx - 6, cy - 5, 12, 8).stroke();
                        doc.moveTo(cx, cy + 3).lineTo(cx, cy + 7).stroke();
                        doc.moveTo(cx - 4, cy + 7).lineTo(cx + 4, cy + 7).stroke();
                        break;
                    case 'Time Management':
                        // Clock icon
                        doc.circle(cx, cy, 7).stroke();
                        doc.moveTo(cx, cy - 4).lineTo(cx, cy).lineTo(cx + 3, cy + 2).stroke();
                        break;
                    case 'Excel Skills':
                        // Grid/table icon
                        doc.rect(cx - 6, cy - 5, 12, 10).stroke();
                        doc.moveTo(cx - 6, cy).lineTo(cx + 6, cy).stroke();
                        doc.moveTo(cx, cy - 5).lineTo(cx, cy + 5).stroke();
                        break;
                    case 'Proficiency':
                        // Chart/bar icon
                        doc.rect(cx - 5, cy + 1, 3, 6).fill(color);
                        doc.rect(cx - 1, cy - 2, 3, 9).fill(color);
                        doc.rect(cx + 3, cy - 5, 3, 12).fill(color);
                        break;
                    case 'Transparency':
                        // Eye icon
                        doc.moveTo(cx - 7, cy).bezierCurveTo(cx - 4, cy - 5, cx + 4, cy - 5, cx + 7, cy).bezierCurveTo(cx + 4, cy + 5, cx - 4, cy + 5, cx - 7, cy).stroke();
                        doc.circle(cx, cy, 3).fill(color);
                        break;
                    case 'Creativity':
                        // Lightbulb icon
                        doc.moveTo(cx, cy - 7).bezierCurveTo(cx + 5, cy - 7, cx + 6, cy - 2, cx + 3, cy + 2).lineTo(cx + 2, cy + 5).lineTo(cx - 2, cy + 5).lineTo(cx - 3, cy + 2).bezierCurveTo(cx - 6, cy - 2, cx - 5, cy - 7, cx, cy - 7).stroke();
                        doc.moveTo(cx - 2, cy + 6).lineTo(cx + 2, cy + 6).stroke();
                        break;
                    case 'Overall':
                        // Star icon
                        doc.save();
                        const outerRadius = 7;
                        const innerRadius = 3;
                        const points = 5;
                        doc.moveTo(cx, cy - outerRadius);
                        for (let i = 0; i < points * 2; i++) {
                            const radius = i % 2 === 0 ? innerRadius : outerRadius;
                            const angle = (Math.PI / points) * i - Math.PI / 2;
                            const px = cx + Math.cos(angle) * radius;
                            const py = cy + Math.sin(angle) * radius;
                            doc.lineTo(px, py);
                        }
                        doc.closePath().fill(color);
                        doc.restore();
                        break;
                    default:
                        doc.circle(cx, cy, 6).stroke();
                }

                doc.lineWidth(1);
            };

            // Helper to draw a card with icon
            const drawCard = (x: number, y: number, title: string, value: string, subtitle?: string) => {
                const iconColor = iconColors[title] || '#64748b';

                // Card background with subtle shadow effect
                doc.roundedRect(x + 1, y + 1, cardWidth, cardHeight, 8).fill('#00000008');
                doc.roundedRect(x, y, cardWidth, cardHeight, 8).fill('white');
                doc.roundedRect(x, y, cardWidth, cardHeight, 8).strokeColor(borderColor).stroke();

                // Draw icon
                drawIcon(x + 12, y + 12, title, iconColor);

                // Title
                doc.fillColor(headerColor)
                    .fontSize(9)
                    .font('Helvetica')
                    .text(title, x + 12, y + 38, { width: cardWidth - 24 });

                // Value with color based on score
                let valueColorFinal = valueColor;
                const numValue = parseInt(value);
                if (!isNaN(numValue)) {
                    if (numValue >= 80) valueColorFinal = '#22c55e';
                    else if (numValue >= 60) valueColorFinal = '#f59e0b';
                    else if (numValue < 50) valueColorFinal = '#ef4444';
                }

                doc.fillColor(valueColorFinal)
                    .fontSize(14)
                    .font('Helvetica-Bold')
                    .text(value || 'N/A', x + 12, y + 52, { width: cardWidth - 24 });

                if (subtitle) {
                    doc.fillColor(headerColor)
                        .fontSize(8)
                        .font('Helvetica')
                        .text(subtitle, x + 12, y + 68, { width: cardWidth - 24 });
                }

                doc.font('Helvetica');
            };

            // Title
            doc.fillColor('#1e293b')
                .fontSize(22)
                .font('Helvetica-Bold')
                .text('Employee Performance Review', startX, currentY, { align: 'center', width: pageWidth });
            doc.font('Helvetica');
            currentY += 45;

            // Employee name and info
            const employeeName = review.employee
                ? `${review.employee.first_name} ${review.employee.last_name}`
                : 'N/A';
            const position = review.employee?.position || '';

            // Row 1: Employee, Presentation, Time Management, Excel Skills
            const row1Cards = [
                { title: 'Employee', value: employeeName, subtitle: position },
                { title: 'Presentation Skills', value: review.score_presentation?.toString() || 'N/A' },
                { title: 'Time Management', value: review.score_time_management?.toString() || 'N/A' },
                { title: 'Excel Skills', value: review.score_excel_skills?.toString() || 'N/A', subtitle: review.employee?.position || '' },
            ];

            row1Cards.forEach((card, i) => {
                drawCard(startX + i * (cardWidth + gapX), currentY, card.title, card.value, card.subtitle);
            });
            currentY += cardHeight + gapY;

            // Row 2: Proficiency, Transparency, Creativity, Overall
            const row2Cards = [
                { title: 'Proficiency', value: review.score_proficiency?.toString() || 'N/A', subtitle: review.review_date },
                { title: 'Transparency', value: review.score_transparency?.toString() || 'N/A' },
                { title: 'Creativity', value: review.score_creativity?.toString() || 'N/A' },
                { title: 'Overall', value: review.score_overall?.toString() || 'N/A' },
            ];

            row2Cards.forEach((card, i) => {
                drawCard(startX + i * (cardWidth + gapX), currentY, card.title, card.value, card.subtitle);
            });
            currentY += cardHeight + gapY + 8;

            // Bottom section: 3 text boxes with improved styling
            const textBoxWidth = (pageWidth - 20) / 3;
            const textBoxHeight = 200;

            // Text box colors and icons
            const textBoxStyles: Record<string, { color: string; bgColor: string; iconType: string }> = {
                'Overall Review': { color: '#6366f1', bgColor: '#eef2ff', iconType: 'review' },
                'Action Items': { color: '#f59e0b', bgColor: '#fffbeb', iconType: 'action' },
                'Employee Commentary': { color: '#06b6d4', bgColor: '#ecfeff', iconType: 'comment' },
            };

            // Helper for improved text box
            const drawTextBox = (x: number, y: number, width: number, title: string, content: string | string[], positiveSkills?: string[], improvementSkills?: string[]) => {
                const style = textBoxStyles[title] || { color: '#64748b', bgColor: '#f8fafc', iconType: 'default' };

                // Shadow effect
                doc.roundedRect(x + 2, y + 2, width, textBoxHeight, 10).fill('#00000008');

                // Box background
                doc.roundedRect(x, y, width, textBoxHeight, 10).fill('white');
                doc.roundedRect(x, y, width, textBoxHeight, 10).strokeColor(borderColor).stroke();

                // Colored header bar
                doc.save();
                doc.roundedRect(x, y, width, 36, 10).clip();
                doc.rect(x, y, width, 36).fill(style.bgColor);
                doc.restore();
                doc.moveTo(x, y + 36).lineTo(x + width, y + 36).strokeColor(borderColor).stroke();

                // Icon in header
                const iconX = x + 14;
                const iconY = y + 11;
                doc.fillColor(style.color);
                doc.strokeColor(style.color);
                doc.lineWidth(1.5);

                if (style.iconType === 'review') {
                    // Clipboard with checkmark
                    doc.rect(iconX, iconY, 12, 14).stroke();
                    doc.rect(iconX + 3, iconY - 2, 6, 4).fill(style.color);
                    doc.moveTo(iconX + 3, iconY + 8).lineTo(iconX + 5, iconY + 10).lineTo(iconX + 9, iconY + 6).stroke();
                } else if (style.iconType === 'action') {
                    // Checklist icon
                    doc.rect(iconX, iconY + 1, 4, 4).fill(style.color);
                    doc.moveTo(iconX + 6, iconY + 3).lineTo(iconX + 14, iconY + 3).stroke();
                    doc.rect(iconX, iconY + 8, 4, 4).fill(style.color);
                    doc.moveTo(iconX + 6, iconY + 10).lineTo(iconX + 14, iconY + 10).stroke();
                } else if (style.iconType === 'comment') {
                    // Chat bubble icon
                    doc.moveTo(iconX, iconY + 2).lineTo(iconX + 12, iconY + 2).lineTo(iconX + 12, iconY + 10).lineTo(iconX + 6, iconY + 10).lineTo(iconX + 3, iconY + 14).lineTo(iconX + 3, iconY + 10).lineTo(iconX, iconY + 10).closePath().stroke();
                }

                doc.lineWidth(1);

                // Title
                doc.fillColor(style.color)
                    .fontSize(11)
                    .font('Helvetica-Bold')
                    .text(title, x + 32, y + 12, { width: width - 44 });
                doc.font('Helvetica');

                // Content area
                let contentY = y + 48;
                doc.fillColor(valueColor).fontSize(9);

                if (title === 'Overall Review' && (positiveSkills?.length || improvementSkills?.length)) {
                    // Special handling for overall review with sections
                    if (positiveSkills?.length) {
                        doc.fillColor('#22c55e').font('Helvetica-Bold').fontSize(9)
                            .text('Positive Skills', x + 14, contentY, { width: width - 28 });
                        contentY += 14;
                        doc.fillColor(valueColor).font('Helvetica');
                        positiveSkills.forEach((skill) => {
                            if (contentY < y + textBoxHeight - 30) {
                                // Green bullet
                                doc.circle(x + 18, contentY + 4, 2).fill('#22c55e');
                                doc.fillColor(valueColor).text(skill, x + 26, contentY, { width: width - 40 });
                                contentY += 13;
                            }
                        });
                        contentY += 6;
                    }

                    if (improvementSkills?.length) {
                        doc.fillColor('#ef4444').font('Helvetica-Bold').fontSize(9)
                            .text('Areas for Improvement', x + 14, contentY, { width: width - 28 });
                        contentY += 14;
                        doc.fillColor(valueColor).font('Helvetica');
                        improvementSkills.forEach((skill) => {
                            if (contentY < y + textBoxHeight - 20) {
                                // Red bullet
                                doc.circle(x + 18, contentY + 4, 2).fill('#ef4444');
                                doc.fillColor(valueColor).text(skill, x + 26, contentY, { width: width - 40 });
                                contentY += 13;
                            }
                        });
                    }

                    if (!positiveSkills?.length && !improvementSkills?.length) {
                        doc.fillColor('#94a3b8').text('No review content', x + 14, contentY, { width: width - 28 });
                    }
                } else if (Array.isArray(content)) {
                    content.forEach((item) => {
                        if (contentY < y + textBoxHeight - 20) {
                            doc.circle(x + 18, contentY + 4, 2).fill(style.color);
                            doc.fillColor(valueColor).text(item, x + 26, contentY, { width: width - 40 });
                            contentY += 13;
                        }
                    });
                    if (content.length === 0) {
                        doc.fillColor('#94a3b8').text('None listed', x + 14, contentY, { width: width - 28 });
                    }
                } else {
                    doc.fillColor(content ? valueColor : '#94a3b8')
                        .text(content || 'None provided', x + 14, contentY, { width: width - 28, height: textBoxHeight - 70 });
                }
            };

            // Draw the three text boxes
            drawTextBox(startX, currentY, textBoxWidth, 'Overall Review', '', review.positive_skills, review.improvement_skills);
            drawTextBox(startX + textBoxWidth + 10, currentY, textBoxWidth, 'Action Items', review.action_items || '');
            drawTextBox(startX + (textBoxWidth + 10) * 2, currentY, textBoxWidth, 'Employee Commentary', review.employee_commentary || '');

            // ============ PAGE 2: Employee Deep Dive ============
            if (employeeDetails) {
                doc.addPage();
                currentY = 40;

                // Title
                doc.fillColor('#1e293b')
                    .fontSize(20)
                    .font('Helvetica-Bold')
                    .text('Employee Deep Dive', startX, currentY, { align: 'center', width: pageWidth });
                doc.font('Helvetica');
                currentY += 50;

                // Employee header card (full width)
                doc.roundedRect(startX, currentY, pageWidth, 80, 8)
                    .fill('#f1f5f9')
                    .stroke(borderColor);

                doc.fillColor('#1e293b')
                    .fontSize(18)
                    .font('Helvetica-Bold')
                    .text(`${employeeDetails.first_name} ${employeeDetails.last_name}`, startX + 20, currentY + 15);

                doc.fillColor('#64748b')
                    .fontSize(12)
                    .font('Helvetica')
                    .text(employeeDetails.position || 'No position', startX + 20, currentY + 38);

                doc.text(`${employeeDetails.department || 'No department'} • ${employeeDetails.level || 'No level'}`, startX + 20, currentY + 55);

                // Status badge
                const statusColor = employeeDetails.status === 'ACTIVE' ? '#22c55e' : '#ef4444';
                const statusX = startX + pageWidth - 80;
                doc.roundedRect(statusX, currentY + 20, 60, 22, 11)
                    .fill(statusColor);
                doc.fillColor('white')
                    .fontSize(10)
                    .text(employeeDetails.status || 'ACTIVE', statusX + 10, currentY + 26);

                currentY += 100;

                // Info sections in 2 columns
                const colWidth = (pageWidth - 20) / 2;
                const sectionHeight = 140;

                // Personal Information Section
                doc.roundedRect(startX, currentY, colWidth, sectionHeight, 6)
                    .fill(cardBg)
                    .stroke(borderColor);

                doc.fillColor('#1e293b')
                    .fontSize(12)
                    .font('Helvetica-Bold')
                    .text('Personal Information', startX + 15, currentY + 15);
                doc.font('Helvetica');

                const personalInfo = [
                    { label: 'Email', value: employeeDetails.email || 'N/A' },
                    { label: 'Employee Code', value: employeeDetails.employee_code || 'N/A' },
                    { label: 'Manager', value: review.reviewer ? `${review.reviewer.first_name} ${review.reviewer.last_name}` : 'N/A' },
                    { label: 'Hire Date', value: employeeDetails.hire_date ? new Date(employeeDetails.hire_date).toLocaleDateString() : 'N/A' },
                ];

                let infoY = currentY + 40;
                personalInfo.forEach(info => {
                    doc.fillColor('#64748b').fontSize(9).text(info.label, startX + 15, infoY);
                    doc.fillColor('#1e293b').fontSize(10).text(info.value, startX + 15, infoY + 12, { width: colWidth - 30 });
                    infoY += 28;
                });

                // Compensation & Capacity Section
                doc.roundedRect(startX + colWidth + 20, currentY, colWidth, sectionHeight, 6)
                    .fill(cardBg)
                    .stroke(borderColor);

                doc.fillColor('#1e293b')
                    .fontSize(12)
                    .font('Helvetica-Bold')
                    .text('Compensation & Capacity', startX + colWidth + 35, currentY + 15);
                doc.font('Helvetica');

                const compInfo = [
                    { label: 'Salary', value: employeeDetails.salary ? `${employeeDetails.currency || 'USD'} ${employeeDetails.salary.toLocaleString()}` : 'N/A' },
                    { label: 'Hourly Rate', value: employeeDetails.hourly_rate ? `${employeeDetails.currency || 'USD'} ${employeeDetails.hourly_rate}/hr` : 'N/A' },
                    { label: 'Monthly Capacity', value: `${employeeDetails.monthly_capacity || 160} hours` },
                    { label: 'Years of Experience', value: employeeDetails.years_of_experience ? `${employeeDetails.years_of_experience} years` : 'N/A' },
                ];

                infoY = currentY + 40;
                compInfo.forEach(info => {
                    doc.fillColor('#64748b').fontSize(9).text(info.label, startX + colWidth + 35, infoY);
                    doc.fillColor('#1e293b').fontSize(10).text(info.value, startX + colWidth + 35, infoY + 12, { width: colWidth - 30 });
                    infoY += 28;
                });

                currentY += sectionHeight + 20;

                // Performance Summary Section
                doc.roundedRect(startX, currentY, pageWidth, 120, 6)
                    .fill(cardBg)
                    .stroke(borderColor);

                doc.fillColor('#1e293b')
                    .fontSize(12)
                    .font('Helvetica-Bold')
                    .text('Performance Summary', startX + 15, currentY + 15);
                doc.font('Helvetica');

                // Score bars
                const scores = [
                    { label: 'Presentation', value: review.score_presentation },
                    { label: 'Time Mgmt', value: review.score_time_management },
                    { label: 'Excel', value: review.score_excel_skills },
                    { label: 'Proficiency', value: review.score_proficiency },
                    { label: 'Transparency', value: review.score_transparency },
                    { label: 'Creativity', value: review.score_creativity },
                    { label: 'Overall', value: review.score_overall },
                ];

                const barStartX = startX + 100;
                const barWidth = pageWidth - 160;
                let barY = currentY + 38;

                scores.forEach(score => {
                    doc.fillColor('#64748b').fontSize(9).text(score.label, startX + 15, barY + 2);

                    // Background bar
                    doc.roundedRect(barStartX, barY, barWidth, 10, 5).fill('#e2e8f0');

                    // Value bar
                    if (score.value !== null && score.value !== undefined) {
                        const fillWidth = (score.value / 100) * barWidth;
                        const barColor = score.value >= 70 ? '#22c55e' : score.value >= 50 ? '#f59e0b' : '#ef4444';
                        doc.roundedRect(barStartX, barY, fillWidth, 10, 5).fill(barColor);

                        doc.fillColor('#1e293b').fontSize(9).text(`${score.value}%`, barStartX + barWidth + 10, barY + 1);
                    } else {
                        doc.fillColor('#94a3b8').fontSize(9).text('N/A', barStartX + barWidth + 10, barY + 1);
                    }

                    barY += 14;
                });

                // Footer
                currentY += 140;
                doc.fillColor('#94a3b8')
                    .fontSize(8)
                    .text(`Generated on ${new Date().toLocaleDateString()} | Review Date: ${review.review_date}`, startX, currentY, { align: 'center', width: pageWidth });
            }

            doc.end();
        });
    }
}
