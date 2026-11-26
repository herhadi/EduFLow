import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma, SignatureMode } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PERMISSIONS } from '../../common/constants/permissions';
import { CreateOutgoingLetterDto } from './dto/create-outgoing-letter.dto';
import { UpdateOutgoingLetterDto } from './dto/update-outgoing-letter.dto';
import { CreateIncomingLetterDto } from './dto/create-incoming-letter.dto';
import { DecideOutgoingLetterDto } from './dto/decide-outgoing-letter.dto';
@Injectable()
export class CorrespondenceService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}
  async getLetterheadSettings() {
    const [setting, principal] = await Promise.all([
      this.prisma.systemSetting.findUnique({ where: { key: 'correspondence.letterhead' } }),
      this.prisma.teacher.findFirst({
        where: { isActive: true, deletedAt: null, user: { is: { roles: { some: { role: { name: 'kepala_sekolah' } } } } } },
        select: { name: true, nip: true },
      }),
    ]);
    const fallback = { logoLeft: null, logoRight: null, rows: [{ text: 'PEMERINTAH KABUPATEN BATANG', fontSize: 12, bold: true, align: 'center', enabled: true }, { text: 'DINAS PENDIDIKAN DAN KEBUDAYAAN', fontSize: 12, bold: true, align: 'center', enabled: true }, { text: 'NAMA SEKOLAH', fontSize: 18, bold: true, align: 'center', enabled: true }, { text: 'Alamat sekolah · Telepon · Email', fontSize: 10, bold: false, align: 'center', enabled: true }], textAlign: 'center', borderStyle: 'double', logoSize: 88, documentTitle: 'SURAT', numberLabel: 'Nomor', openingText: 'Dengan hormat,', closingText: 'Demikian surat ini kami sampaikan. Atas perhatian dan kerja sama yang baik, kami ucapkan terima kasih.', signatureCity: 'Batang', signatureTitle: 'Kepala Sekolah', signatureName: '', signatureNip: '', signatureAlign: 'center' };
    let config = fallback;
    if (setting?.value) { try { config = { ...fallback, ...JSON.parse(setting.value) }; } catch { /* safe defaults */ } }
    return { data: {
      ...config,
      principalName: (typeof config.signatureName === 'string' && config.signatureName.trim()) || principal?.name || null,
      principalNip: (typeof config.signatureNip === 'string' && config.signatureNip.trim()) || principal?.nip || null,
    } };
  }
  async updateLetterheadSettings(userId: string, input: unknown) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new BadRequestException('Pengaturan kop tidak valid');
    const value = input as Record<string, unknown>;
    const validLogo = (logo: unknown) => logo == null || (typeof logo === 'string' && logo.length <= 50000 && /^data:image\/(png|jpeg|webp);base64,/.test(logo));
    if (!validLogo(value.logoLeft) || !validLogo(value.logoRight)) throw new BadRequestException('Logo harus PNG, JPG, atau WebP dengan ukuran maksimal 40 KB setelah optimasi.');
    const rows = Array.isArray(value.rows) ? value.rows : [];
    if (rows.length > 10 || rows.some((row) => !row || typeof row !== 'object' || typeof (row as any).text !== 'string' || (row as any).text.length > 200 || !['left','center','right'].includes((row as any).align) || ![9,10,11,12,14,16,18,20,22].includes(Number((row as any).fontSize)))) throw new BadRequestException('Baris kop tidak valid. Maksimal 10 baris.');
    const config = {
      logoLeft: value.logoLeft ?? null, logoRight: value.logoRight ?? null,
      rows: rows.map((row: any) => ({ text: row.text.trim(), fontSize: Number(row.fontSize), bold: Boolean(row.bold), align: row.align, enabled: row.enabled !== false })),
      textAlign: ['left','center','right'].includes(String(value.textAlign)) ? value.textAlign : 'center',
      borderStyle: ['single','double','none'].includes(String(value.borderStyle)) ? value.borderStyle : 'double',
      logoSize: Math.min(140, Math.max(48, Number(value.logoSize) || 88)),
      documentTitle: typeof value.documentTitle === 'string' ? value.documentTitle.trim().slice(0, 80) : 'SURAT',
      numberLabel: typeof value.numberLabel === 'string' ? value.numberLabel.trim().slice(0, 50) : 'Nomor',
      openingText: typeof value.openingText === 'string' ? value.openingText.slice(0, 1000) : 'Dengan hormat,',
      closingText: typeof value.closingText === 'string' ? value.closingText.slice(0, 2000) : 'Demikian surat ini kami sampaikan. Atas perhatian dan kerja sama yang baik, kami ucapkan terima kasih.',
      signatureCity: typeof value.signatureCity === 'string' ? value.signatureCity.trim().slice(0, 80) : 'Batang',
      signatureTitle: typeof value.signatureTitle === 'string' ? value.signatureTitle.trim().slice(0, 120) : 'Kepala Sekolah',
      signatureName: typeof value.signatureName === 'string' ? value.signatureName.trim().slice(0, 120) : '',
      signatureNip: typeof value.signatureNip === 'string' ? value.signatureNip.trim().slice(0, 40) : '',
      signatureAlign: ['left','center','right'].includes(String(value.signatureAlign)) ? value.signatureAlign : 'center',
    };
    await this.prisma.systemSetting.upsert({ where: { key: 'correspondence.letterhead' }, create: { key: 'correspondence.letterhead', value: JSON.stringify(config) }, update: { value: JSON.stringify(config) } });
    await this.audit.record({ action: 'correspondence.letterhead.updated', entityType: 'SystemSetting', entityId: 'correspondence.letterhead', after: { ...config, logoLeft: Boolean(config.logoLeft), logoRight: Boolean(config.logoRight) }, userId });
    return { data: (await this.getLetterheadSettings()).data, message: 'Pengaturan kop surat berhasil disimpan.' };
  }
  async getSignatureSettings() {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key: 'correspondence.signature_mode' } });
    const mode = setting?.value === 'TTE' ? 'TTE' : 'MANUAL';
    return { data: { mode, tteProviderConfigured: false, tteStatus: mode === 'TTE' ? 'NOT_CONFIGURED' : 'NOT_REQUIRED' } };
  }
  async updateSignatureSettings(userId: string, mode: 'MANUAL' | 'TTE') {
    if (!['MANUAL', 'TTE'].includes(mode)) throw new BadRequestException('Mode tanda tangan tidak valid');
    await this.prisma.systemSetting.upsert({ where: { key: 'correspondence.signature_mode' }, create: { key: 'correspondence.signature_mode', value: mode }, update: { value: mode } });
    await this.audit.record({ action: 'correspondence.signature-mode.updated', entityType: 'SystemSetting', entityId: 'correspondence.signature_mode', after: { mode }, userId });
    return { data: { mode, tteProviderConfigured: false, tteStatus: mode === 'TTE' ? 'NOT_CONFIGURED' : 'NOT_REQUIRED' }, message: 'Mode tanda tangan diubah ke ' + (mode === 'MANUAL' ? 'Manual.' : 'TTE.') };
  }
  async listOutgoing(userId: string, permissions: string[]) {
    const where = permissions.includes(PERMISSIONS.CORRESPONDENCE_MANAGE) || permissions.includes(PERMISSIONS.CORRESPONDENCE_APPROVE) ? {} : { createdById: userId };
    return { data: await this.prisma.outgoingLetter.findMany({ where, include: { creator: { select: { id: true, name: true } }, approver: { select: { id: true, name: true } } }, orderBy: { updatedAt: 'desc' }, take: 200 }) };
  }
  async listIncoming() {
    return { data: await this.prisma.incomingLetter.findMany({ include: { receiver: { select: { id: true, name: true } } }, orderBy: { receivedAt: 'desc' }, take: 200 }) };
  }
  async listApprovals() {
    return { data: await this.prisma.outgoingLetter.findMany({ where: { status: 'PENDING_APPROVAL' }, include: { creator: { select: { id: true, name: true } } }, orderBy: { submittedAt: 'asc' }, take: 200 }) };
  }
  async createOutgoing(userId: string, dto: CreateOutgoingLetterDto) {
    const letter = await this.prisma.outgoingLetter.create({ data: { subject: dto.subject.trim(), recipient: dto.recipient.trim(), letterDate: new Date(dto.letterDate), body: dto.body.trim(), createdById: userId } });
    await this.audit.record({ action: 'correspondence.outgoing.created', entityType: 'OutgoingLetter', entityId: letter.id, after: letter, userId });
    return { data: letter, message: 'Draft surat keluar berhasil dibuat.' };
  }
  async updateOutgoing(userId: string, id: string, dto: UpdateOutgoingLetterDto) {
    const existing = await this.prisma.outgoingLetter.findFirst({ where: { id, createdById: userId } });
    if (!existing) throw new NotFoundException('Surat tidak ditemukan');
    if (!['DRAFT', 'REVISION_REQUESTED'].includes(existing.status)) throw new BadRequestException('Surat tidak dapat diubah pada status ini');
    const letter = await this.prisma.outgoingLetter.update({ where: { id }, data: {
      ...(dto.subject !== undefined ? { subject: dto.subject.trim() } : {}),
      ...(dto.recipient !== undefined ? { recipient: dto.recipient.trim() } : {}),
      ...(dto.letterDate !== undefined ? { letterDate: new Date(dto.letterDate) } : {}),
      ...(dto.body !== undefined ? { body: dto.body.trim() } : {}), status: 'DRAFT', revisionNote: null,
    } });
    await this.audit.record({ action: 'correspondence.outgoing.updated', entityType: 'OutgoingLetter', entityId: id, before: existing, after: letter, userId });
    return { data: letter, message: 'Draft surat diperbarui.' };
  }
  async submitOutgoing(userId: string, id: string) {
    const existing = await this.prisma.outgoingLetter.findFirst({ where: { id, createdById: userId } });
    if (!existing) throw new NotFoundException('Surat tidak ditemukan');
    if (!['DRAFT', 'REVISION_REQUESTED'].includes(existing.status)) throw new BadRequestException('Surat tidak dapat diajukan pada status ini');
    const letter = await this.prisma.outgoingLetter.update({ where: { id }, data: { status: 'PENDING_APPROVAL', submittedAt: new Date(), revisionNote: null } });
    await this.audit.record({ action: 'correspondence.outgoing.submitted', entityType: 'OutgoingLetter', entityId: id, before: existing, after: letter, userId });
    return { data: letter, message: 'Surat dikirim ke Kepala Sekolah untuk persetujuan.' };
  }
  async decideOutgoing(userId: string, id: string, dto: DecideOutgoingLetterDto) {
    const existing = await this.prisma.outgoingLetter.findFirst({ where: { id, status: 'PENDING_APPROVAL' } });
    if (!existing) throw new NotFoundException('Surat yang menunggu persetujuan tidak ditemukan');
    if (dto.status === 'REVISION_REQUESTED') {
      if (!dto.revisionNote?.trim()) throw new BadRequestException('Catatan revisi wajib diisi');
      const letter = await this.prisma.outgoingLetter.update({ where: { id }, data: { status: 'REVISION_REQUESTED', revisionNote: dto.revisionNote.trim() } });
      await this.audit.record({ action: 'correspondence.outgoing.revision-requested', entityType: 'OutgoingLetter', entityId: id, before: existing, after: letter, userId });
      return { data: letter, message: 'Surat dikembalikan untuk diperbaiki.' };
    }
    const activeMode = (await this.getSignatureSettings()).data.mode as SignatureMode;
    const letterhead = (await this.getLetterheadSettings()).data;
    if (activeMode === 'TTE') throw new BadRequestException('Mode TTE dipilih tetapi penyedia TTE/PSrE belum dikonfigurasi. Hubungkan penyedia TTE terlebih dahulu atau ubah mode ke Manual.');
    const approvedAt = new Date();
    const approvalCode = randomUUID();
    const contentHash = createHash('sha256').update([existing.id, existing.subject, existing.recipient, existing.letterDate.toISOString(), existing.body, approvedAt.toISOString(), userId].join('|')).digest('hex');
    const letter = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', 'eduflow-outgoing-letter-' + approvedAt.getFullYear());
      const start = new Date(Date.UTC(approvedAt.getFullYear(), 0, 1));
      const end = new Date(Date.UTC(approvedAt.getFullYear() + 1, 0, 1));
      const count = await tx.outgoingLetter.count({ where: { status: 'APPROVED', approvedAt: { gte: start, lt: end } } });
      const roman = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][approvedAt.getMonth()];
      const number = String(count + 1).padStart(3, '0') + '/EDUFLOW/' + roman + '/' + approvedAt.getFullYear();
      return tx.outgoingLetter.update({ where: { id }, data: { status: 'APPROVED', signatureMode: activeMode, approvedById: userId, approvedAt, approvalCode, contentHash, letterNumber: number, letterheadSnapshot: letterhead as Prisma.InputJsonValue, revisionNote: null }, include: { creator: { select: { id: true, name: true } }, approver: { select: { id: true, name: true } } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await this.audit.record({ action: 'correspondence.outgoing.approved', entityType: 'OutgoingLetter', entityId: id, before: existing, after: letter, userId });
    return { data: letter, message: 'Surat disetujui dan nomor surat diterbitkan.' };
  }
  async createIncoming(userId: string, dto: CreateIncomingLetterDto) {
    const letter = await this.prisma.incomingLetter.create({ data: { referenceNumber: dto.referenceNumber?.trim() || null, sender: dto.sender.trim(), subject: dto.subject.trim(), letterDate: dto.letterDate ? new Date(dto.letterDate) : null, notes: dto.notes?.trim() || null, receivedById: userId } });
    await this.audit.record({ action: 'correspondence.incoming.registered', entityType: 'IncomingLetter', entityId: letter.id, after: letter, userId });
    return { data: letter, message: 'Surat masuk berhasil dicatat.' };
  }
}
