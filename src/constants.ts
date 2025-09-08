/** Множитель размера изображений */
export const IMG_SCALE = 6;
/** Ширина коллизии бокса */
export const BOX_WIDTH = 110;
/** Высота коллизии бокса */
export const BOX_HEIGHT = 104;
export const GROUND_HEIGHT = 60;
/** Кол-во боксов для начала раскачки башни */
export const MIN_BOXES_TO_SWING = 2;
/** Скорость раскачки руки */
export const HAND_OSCILLATION_SPEED = 0.005;
/** Угол в радианах, на который поворачивается рука */
export const HAND_OSCILLATION_ANGLE_MAX_RAD = 0.2;
/** Расстояние в px, на которое колеблется рука по горизонтали */
export const HAND_OSCILLATION_AMPLITUDE_PX = 50;
/** Расстояние в px, которое считается успешным для установки бокса */
export const BOX_PLACEMENT_TOLERANCE_PX = BOX_WIDTH * 0.3;
/** Расстояние в px, на которое сдвигается камера после успешной установки бокса */
export const CAMERA_STEP_PX = 104;

/** Скорость, с которой рука поднимается вверх */
export const ANIMATE_HAND_UP_SPEED = 5;
/** Скорость, с которой рука опускается вниз */
export const ANIMATE_HAND_DOWN_SPEED = 10;

/** Коэффициент сложности в зависимости от `difficulty` (придет от яндекс лавки) */
export const TILT_BY_DIFFICULTY = {
	1: 0.3,
	2: 0.4,
	3: 0.5,
	4: 0.6,
	5: 0.7,
	6: 0.8,
	7: 0.9,
	8: 1.0,
	9: 1.1,
	10: 1.2,
} as const;
