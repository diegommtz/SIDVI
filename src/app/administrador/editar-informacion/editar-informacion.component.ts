import { Component, OnInit } from '@angular/core';
import { Virus, Informacion } from 'src/models';
import { SIDVIServices, Defaults, ContentTypeEnum } from 'src/api';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faSearchPlus, faSearchMinus } from '@fortawesome/free-solid-svg-icons';
import { VgAPI } from 'videogular2/compiled/core';

@Component({
    selector: 'app-editar-informacion',
    templateUrl: './editar-informacion.component.html',
    styleUrls: ['./editar-informacion.component.scss'],
})
export class EditarInformacionComponent implements OnInit {

    virus: Virus;

    icons: { [id: string]: IconDefinition } = {
        zoomIn: faSearchPlus,
        zoomOut: faSearchMinus
    };

    constructor(
        private sidvi: SIDVIServices,
        private activatedRoute: ActivatedRoute,
        private sanitizer: DomSanitizer
    ) {
        this.virus = new Virus();
    }

    ngOnInit() {
        this.listarVirus();
    }
    
    
    listarVirus() {
        this.virus.idVirus = parseInt(this.activatedRoute.snapshot.paramMap.get('idVirus'), 10);
        this.sidvi.virus.obtenerVirus(this.virus.idVirus).subscribe(
            virus => {
                this.virus = virus;

                if (Defaults.allowBase64Types.includes(this.virus.mimetypeIcono)) {
                    this.virus.archivoIconoImg = this.sanitizer.bypassSecurityTrustResourceUrl(this.virus.archivoIcono as string);
                }

                this.sidvi.informacion.listarInformaciones(this.virus.idVirus).subscribe(
                    informaciones => {
                        this.virus.informaciones = informaciones.resultados.map((item: any) => new Informacion(item));

                        for (const informacion of this.virus.informaciones) {
                            if (Defaults.allowBase64Types.includes(informacion.mimetype)) {
                                informacion.archivoImg = this.sanitizer.bypassSecurityTrustResourceUrl(informacion.archivo as string);
                            }
                            if (informacion.mimetype === ContentTypeEnum.MP4) {
                                informacion.archivoVideo = this.sidvi.informacion.urlInformacionArchivo(informacion.idInformacion);
                            }
                            if (informacion.mimetype === ContentTypeEnum.PDF) {
                                informacion.archivoPdf = this.sidvi.informacion.urlInformacionArchivo(informacion.idInformacion);
                                informacion.archivoPdfZoom = 1;
                            }
                        }
                    });
            });
    }

    onPlayerReady(informacion: Informacion, api: VgAPI) {
        informacion.archivoVideoAPI = api;
        informacion.archivoVideoAPI.getDefaultMedia().subscriptions.ended.subscribe(
            () => {
                informacion.archivoVideoAPI.getDefaultMedia().currentTime = 0;
            }
        );
    }
    pdfZoomIn(informacion: Informacion) {
        informacion.archivoPdfZoom += 0.1;
    }
    pdfZoomOut(informacion: Informacion) {
        informacion.archivoPdfZoom -= 0.1;
    }

    guardar(informacion: Informacion, texto: string, descripcion: string) {

        informacion.texto = texto;
        informacion.descripcion = descripcion;
        delete informacion.archivo;
        delete informacion.mimetype;

        console.log(informacion);

        this.sidvi.informacion.actualizarInformacion(informacion.idInformacion, informacion).subscribe(
            res => {
                if (res) {

                    // Checar si se subio un doc
                    if (informacion.localFile != null) {
                        this.actualizarInformacion(informacion);
                        informacion.localFile = null;
                        informacion.localFileName = 'Choose file';
                        return;
                    }

                    // Mostrar un sweetalert de que se actualizó (si se puede como juliox en cuestionarios)
                    console.log('Información actualizada correctamente');
                }
            },
            error => {
                alert('No se pudo loguear');
            }
        );
    }

    actualizarInformacion(informacion: Informacion) {
        this.sidvi.informacion.cargarInformacionArchivo(informacion.idInformacion, informacion.localFile[0]).subscribe(
            res => {
                if (res) {
                    console.log('Archivos actualizados correctamente');
                    this.listarVirus();
                }
            },
            error => {
                alert('Los archivos no se pudieron actualizar');
            }
        );
    }

    eliminar(informacion: Informacion) {

    }

    handleFileInput(informacion: Informacion, files: FileList) {
        if (files[0] != null) {
            informacion.localFile = files;
            informacion.localFileName = files[0].name;
        }
    }

}