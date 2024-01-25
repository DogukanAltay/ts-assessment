import { Annotation, Entity, EntityClass, EntityType, Input } from './types/input';
import { ConvertedAnnotation, ConvertedEntity, Output } from './types/output';
import _ from 'lodash';
import * as yup from 'yup';

// TODO: Convert Input to the Output structure. Do this in an efficient and generic way.
// HINT: Make use of the helper library "lodash"

const exportedEntities = [
  '65afd280db285265fae6c728',
  '65afd286db285265fae6c74c',
  '65afd290db285265fae6c770',
  '65afd2a4db285265fae6c794',
  '65afd45bdb285265fae6ca90',
  '65afda01db285265fae6da4d',
];

export const convertInput = (input: Input): Output => {
  const documents = input.documents.map((document) => {
    // TODO: map the entities to the new structure and sort them based on the property "name"
    // Make sure the nested children are also mapped and sorted
    const entityGroup = _.groupBy(document.entities, 'refs');
    const entities = document.entities.map((entity) => convertEntity(entity, entityGroup)).sort(sortEntities);

    // TODO: map the annotations to the new structure and sort them based on the property "index"
    // Make sure the nested children are also mapped and sorted
    const entityMap = _.keyBy(entities, 'id');
    const annotationGroup = _.groupBy(document.annotations, 'refs');
    const annotations = document.annotations
      .map((annotation) => convertAnnotation(annotation, annotationGroup, entityMap))
      .filter((annotation) => exportedEntities.includes(annotation.id))
      .sort(sortAnnotations);

    return { id: document.id, entities, annotations };
  });

  return { documents };
};

// HINT: you probably need to pass extra argument(s) to this function to make it performant.
const convertEntity = (entity: Entity, entityGroup: _.Dictionary<Entity[]>): ConvertedEntity => {
  return <ConvertedEntity>{
    ..._.omit(entity, 'refs', 'threshold', 'imageType'),
    children: entityGroup[entity.id]?.map((entity) => convertEntity(entity, entityGroup)).sort(sortEntities) ?? [],
  };
};

// HINT: you probably need to pass extra argument(s) to this function to make it performant.
const convertAnnotation = (
  annotation: Annotation,
  annotationGroup: _.Dictionary<Annotation[]>,
  entityGroup: _.Dictionary<ConvertedEntity>,
): ConvertedAnnotation => {
  const convertedAnnotation: ConvertedAnnotation = {
    value: annotation.value,
    entity: _.pick(entityGroup[annotation.entityId], 'id', 'name'),
    id: entityGroup[annotation.entityId].id,
    index: 0,
    children: [],
  };

  if (annotationGroup[annotation.id]) {
    convertedAnnotation.children = annotationGroup[annotation.id]
      .map((annotation) => convertAnnotation(annotation, annotationGroup, entityGroup))
      .sort(sortAnnotations);
  }

  if (annotation.indices?.length) {
    convertedAnnotation.index = annotation.indices[0].start;
  } else {
    convertedAnnotation.index = convertedAnnotation.children[0]?.index;
  }

  return convertedAnnotation;
};

const sortEntities = (entityA: ConvertedEntity, entityB: ConvertedEntity): number => {
  const nameA = entityA.name.toLowerCase();
  const nameB = entityB.name.toLowerCase();
  return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
};

const sortAnnotations = (annotationA: ConvertedAnnotation, annotationB: ConvertedAnnotation) => {
  return annotationA.index - annotationB.index;
};

// BONUS: Create validation function that validates the result of "convertInput". Use yup as library to validate your result.

export const validateOutput = (output: Output): boolean => {
  const entitySchema: yup.AnySchema = yup.object<ConvertedEntity>().shape({
    id: yup.string().required(),
    name: yup.string().required(),
    type: yup.mixed<EntityType>().required(),
    class: yup.mixed<EntityClass>().required(),
    children: yup
      .array<ConvertedEntity>()
      .of(yup.lazy(() => entitySchema))
      .required(),
  });

  const annotationSchema: yup.AnySchema = yup.object<ConvertedAnnotation>().shape({
    id: yup.string().required(),
    entity: yup
      .object()
      .shape({
        id: yup.string().required(),
        name: yup.string().required(),
      })
      .required(),
    index: yup.number().required(),
    children: yup
      .array<ConvertedAnnotation>()
      .of(yup.lazy(() => annotationSchema))
      .required(),
  });

  const outputSchema = yup.object().shape({
    documents: yup
      .array()
      .of(
        yup.lazy(() =>
          yup.object().shape({
            id: yup.string().required(),
            entities: yup.array<ConvertedEntity>().of(entitySchema).required(),
            annotations: yup.array<ConvertedAnnotation>().of(annotationSchema).required(),
          }),
        ),
      )
      .required(),
  });

  return outputSchema.isValidSync(output);
};
