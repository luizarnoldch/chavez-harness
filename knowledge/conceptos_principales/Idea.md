La idea es que esta sea una app  web mobile first. De ahora `web mobiel first = chavez harness`.

Philosofy:

- Mobile First Approach
- Markdown compatibility
- Connect task with AI chat.

Manejaremos información compleja y lo separamos por secciones pero al final todo debe estar integrado:

Workspace Agentico:

1. Workspaces son folders que pueden contener más folders y/o archivos en tiempo real que podemos seleccionar y guardar para agregar sesiones de chats.
2. La navegación en el workspace tiene que ser gradual, ya que en caso contrario se sobrecargaría la busqueda de archivos.
3. La idea es que chavez harness pueda ser facil de usar en telefonos. Es es el requisitos principal
4. Luego de que el workspace (folder) haya sido elegido, pasamos a la parte de sesiones done veremos todas las sesiones dentro del workspace, estas sesiones pueden estar en curso o no. Tambien se pueden detener en caso sea necesario, si se detiene tiene que haber un modal de confirmación.
5. Luego de que ingresas a la session, puede ver el historial de chat entre una IA y un humano (la persona que utiliza chavez-harness). La secsiones de carga deben mostrar el tool calling, como el LLM edita el codigo y demás cosas que encuentras en un LLM web como chatgpt o claude, en este caso nosotros utilizaremos Cursor así que de ser posible mostrar lo más relevante para el chat.

Manejo de Agentes, Skill y Proveedores (Buscar un mejor nombre)

1. Conecto .cursor/, .agents/, .claude/, .codex/, .opencode/ con la vista web, la idea es que se puedan crear nuevos agentes, skill y agregar nuevos proveeder de LLM IA.
2. Los agentes debe estar escritos en formato markdown. Los agentes tambien debería estar en formato markdown sigueindo las reglas de siempre tener el SKILL.md y además las carpetas scripts/ assets/ references/.
3. Dentro de las carpetas scripts netamente se deben visualizar archivos .sh y markdown si es necesario.
4. Estos archivos deben estar siempre sincronizados con la carpeta .cursor/ .agents/ para que el LLM sepa como trabajar o que herramientas usar.

Manejo de Proyectos:

1. Se debe tener una sección de tareas y proyectos donde se registren en formato markdown tickets relacionados a proyectos, estos tickets deber permitir adjuntar o enlazar otros archivos.
2. Cada ticket debe mostrar blockeos, dependencias y relaciones con otros tickets. Debe mostrar el estado del ticket y demás metadata relevante.
3. El objetivo principal es utilizar estos tickets como registro e input que deben tener la posibilidad de correrse o ejecutarse en el LLM antes creado.
4. Los tickets tiene niveles:
	4.1. Todo: Talvez el ticket esta vacio y se definen solo los escenarios, funcionalidades principales, y el alcance del ticket.
	4.2. Plan: Agrega documentación técnica, archivos que se deben modificar y en que lineas, se guarda en contexto la lectura de archivos relevantes y además la estrategia paso a paso para resolver el problema.
	4.3. Build: Se ejecutan los cambios de la estrategia paso a paso.
	4.4. Test: Se realizan los test de pruebas para validar que el Build hizo bien el trabajo y además pruebas como coverage, testing, lint y format.

Segundo Cerebro

1. En esta seccion se debe hacer referencia a información, debe funcionar como un editor de codigo tipo obsidian en formato markdown ya que lo que buscamos es editar texto y además generar con AI.
2. La idea principal es que este conocimiento sea granular y además organizado con el OKF (open knowledge format), compatible con obsidian y además que markdown.
3. Dentro de este markdown las gráficas mermaid se podrán hacer zoom para verlo en pantalla grande.
4. Las tablas markdown tambien deberían tener una opción para verlo en pantalla completa.