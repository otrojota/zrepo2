# Pasos para agregar un ZDashboardElement

1. Crear Clase 
    * P.Ej: /zdashboards/DimRowSelector.js (+ .html)

2. Crear opción (agregar) en
    * /main/home/configs/LayoutCellConfig.html

3. Agregar inicialización del elemento en
    * /main/home/configs/LayoutCellConfig.js
    * Usar el mismo Id del paso 2
    * linea 24 app.

4. Registrar clase creada a ZDashboard
    * /zdashboards/ZDashboard.js
    * Linea 92

5. Registrar en Editor de Dashboards
    * /main/home/Dashboard
        * Registrar en el arbol (nodo)
            * Linea 147
        * Agregarlo en la lista (string separados por punto) en linea 296 o en un if aparte si tiene panel propio
            * Crear panel propio en /main/home/configs

6. Agregar ventana de configuración específica (si no se usó panel en 5)
    * Crear ventana en zdashboards/chartProps/WMiElemento.js + html
    * Registrar ventana en /main/home/configs/GenericElementConfig.js (linea 99)

