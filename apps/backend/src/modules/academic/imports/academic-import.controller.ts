import {
  BadRequestException,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from '../../../common/decorators/public.decorator';
import { AcademicImportService } from './academic-import.service';

type ImportType = 'teachers' | 'students';

const allowedTypes = ['teachers', 'students'];

@Public()
@Controller('academic/import')
export class AcademicImportController {
  constructor(private readonly academicImportService: AcademicImportService) {}

  @Post(':type')
  @UseInterceptors(FileInterceptor('file'))
  import(
    @Param('type') type: ImportType,
    @UploadedFile() file?: { buffer: Buffer; originalname?: string },
  ) {
    if (!allowedTypes.includes(type)) {
      throw new BadRequestException('Tipe import tidak valid');
    }

    return this.academicImportService.import(type, file);
  }
}
